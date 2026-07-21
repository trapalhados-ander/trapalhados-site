module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const MEMBERS_CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';
    const MATCHES_CHANNEL_ID = '1529238301863837706'; 

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN) {
        return res.status(500).json({ error: "Faltam chaves de API." });
    }

    try {
        // 1. Obter Membros e Apelidos
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${MEMBERS_CHANNEL_ID}/messages?limit=50`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` },
            cache: 'no-store'
        });
        
        const SQUAD = [];
        if (discordRes.ok) {
            const data = await discordRes.json();
            data.forEach(msg => {
                const lines = msg.content.split('\n');
                let nome = "", apelido = "";
                lines.forEach(line => {
                    const lower = line.toLowerCase();
                    if (lower.startsWith('nome:')) nome = line.substring(5).trim();
                    if (lower.startsWith('apelido:')) apelido = line.substring(8).trim();
                });
                if (nome) SQUAD.push({ nome, apelido: apelido || nome });
            });
        }

        if (SQUAD.length === 0) return res.status(400).json({ error: "Nenhum membro encontrado." });

        // Vamos pegar 3 jogadores ativos para buscar partidas recentes
        const activePlayers = SQUAD.slice(0, 3).map(s => s.apelido).join(',');

        const pRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${activePlayers}`, {
            headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' },
            cache: 'no-store'
        });
        
        if (!pRes.ok) return res.status(pRes.status).json({ error: "Erro ao buscar jogadores" });
        
        const pData = await pRes.json();
        
        // Coletar os últimos Match IDs
        let matchIdsToTry = [];
        for (const player of pData.data) {
            if (player.relationships && player.relationships.matches && player.relationships.matches.data.length > 0) {
                const pMatches = player.relationships.matches.data.slice(0, 3).map(m => m.id);
                matchIdsToTry.push(...pMatches);
            }
        }

        if (matchIdsToTry.length === 0) return res.status(200).json({ message: "Nenhuma partida recente encontrada." });
        
        matchIdsToTry = [...new Set(matchIdsToTry)];

        // 2. Buscar detalhes da partida até achar uma TPP ('squad')
        let validMatchData = null;
        for (const mId of matchIdsToTry) {
            const mRes = await fetch(`https://api.pubg.com/shards/steam/matches/${mId}`, {
                headers: { 'Accept': 'application/vnd.api+json' },
                cache: 'no-store'
            });
            if (mRes.ok) {
                const mData = await mRes.json();
                if (mData.data.attributes.gameMode === 'squad') {
                    validMatchData = mData;
                    break;
                }
            }
        }
        
        if (!validMatchData) return res.status(200).json({ message: "Nenhuma partida TPP recente encontrada." });

        const mData = validMatchData;
        const latestMatchId = mData.data.id;
        const mapName = mData.data.attributes.mapName;
        const gameMode = mData.data.attributes.gameMode;
        const createdAt = mData.data.attributes.createdAt;
        const included = mData.included;

        // 3. Mapear Participantes do Clã
        const clanParticipantIds = [];
        const clanNicknames = SQUAD.map(s => s.apelido.toLowerCase());
        
        for (const item of included) {
            if (item.type === 'participant') {
                const playerName = item.attributes.stats.name.toLowerCase();
                if (clanNicknames.includes(playerName)) {
                    clanParticipantIds.push(item.id);
                }
            }
        }

        if (clanParticipantIds.length === 0) {
            return res.status(200).json({ message: "Nenhum membro do clã encontrado nesta partida." });
        }

        // 4. Encontrar o Roster (Time)
        let clanRoster = null;
        for (const item of included) {
            if (item.type === 'roster') {
                const parts = item.relationships.participants.data;
                // Se algum dos participantes for do clã, este é o time do clã
                if (parts.some(p => clanParticipantIds.includes(p.id))) {
                    clanRoster = {
                        rank: item.attributes.stats.rank,
                        won: item.attributes.won,
                        participants: parts.map(p => p.id)
                    };
                    break;
                }
            }
        }

        if (!clanRoster) return res.status(200).json({ message: "Roster não encontrado." });

        // 5. Somar estatísticas do Roster e identificar membros
        let totalKills = 0;
        let totalDamage = 0;
        const rosterMembers = [];

        for (const pid of clanRoster.participants) {
            const pData = included.find(i => i.id === pid);
            if (pData) {
                totalKills += pData.attributes.stats.kills;
                totalDamage += pData.attributes.stats.damageDealt;
                rosterMembers.push(pData.attributes.stats.name);
            }
        }

        const matchResult = {
            id: latestMatchId,
            date: createdAt,
            map: mapName,
            mode: gameMode,
            rank: clanRoster.rank,
            won: clanRoster.won === "true" || clanRoster.won === true,
            kills: totalKills,
            damage: totalDamage.toFixed(0),
            players: rosterMembers
        };

        // 6. Ler histórico de partidas do Discord (para não duplicar)
        const dbRes = await fetch(`https://discord.com/api/v10/channels/${MATCHES_CHANNEL_ID}/messages?limit=1`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` },
            cache: 'no-store'
        });
        
        let history = [];
        if (dbRes.ok) {
            const dbMsgs = await dbRes.json();
            if (dbMsgs.length > 0) {
                const content = dbMsgs[0].content.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(content);
                if (parsed && parsed.history) history = parsed.history;
            }
        }

        // Adicionar nova partida se não existir
        if (!history.find(h => h.id === matchResult.id)) {
            history.unshift(matchResult);
            // Manter apenas as últimas 5 partidas no histórico
            if (history.length > 5) history = history.slice(0, 5);

            const messageContent = JSON.stringify({
                type: 'MATCH_HISTORY',
                updatedAt: new Date().toISOString(),
                history: history
            });

            await fetch(`https://discord.com/api/v10/channels/${MATCHES_CHANNEL_ID}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `\`\`\`json\n${messageContent}\n\`\`\`` })
            });

            return res.status(200).json({ success: true, message: "Nova partida salva!", match: matchResult });
        } else {
            return res.status(200).json({ success: true, message: "Partida já existia no histórico.", match: matchResult });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
