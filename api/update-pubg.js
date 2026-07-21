module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;
    const MEMBERS_CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "Faltam chaves de API na Vercel." });
    }

    // 1. Buscar a lista de membros do Discord
    let SQUAD = [];
    try {
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${MEMBERS_CHANNEL_ID}/messages?limit=50`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });
        
        if (discordRes.ok) {
            const data = await discordRes.json();
            data.forEach(msg => {
                const lines = msg.content.split('\n');
                let nome = "";
                lines.forEach(line => {
                    if (line.toLowerCase().startsWith('nome:')) nome = line.substring(5).trim();
                });
                if (nome) SQUAD.push(nome);
            });
        }
    } catch (e) {
        console.error("Erro ao buscar membros no Discord", e);
    }

    if (SQUAD.length === 0) {
        return res.status(400).json({ error: "Nenhum membro encontrado no Discord." });
    }

    // 2. Função para buscar stats reais no PUBG
    async function getPubgPlayerStats(playerName) {
        try {
            // Busca o ID da conta
            const playerRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`, {
                headers: {
                    'Authorization': `Bearer ${PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            
            if (!playerRes.ok) return null;
            const playerData = await playerRes.json();
            const accountId = playerData.data[0].id;

            // Busca os stats vitais (Lifetime)
            const statsRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/seasons/lifetime`, {
                headers: {
                    'Authorization': `Bearer ${PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });

            if (!statsRes.ok) return null;
            const statsData = await statsRes.json();
            
            // Calculando o KD agregado (ex: squad-fpp)
            const squadFpp = statsData.data.attributes.gameModeStats['squad-fpp'] || {};
            const kills = squadFpp.kills || 0;
            const wins = squadFpp.wins || 0;
            const matches = squadFpp.roundsPlayed || 0;
            const deaths = matches - wins;
            
            let realKd = "0.00";
            if (deaths > 0) realKd = (kills / deaths).toFixed(2);
            else if (kills > 0) realKd = kills.toFixed(2);

            // A arma favorita exige buscar a masteria de armas (Weapon Mastery)
            let favWeapon = "Desconhecida";
            const weaponRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/weapon_mastery`, {
                headers: {
                    'Authorization': `Bearer ${PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });

            if (weaponRes.ok) {
                const weaponData = await weaponRes.json();
                const weapons = weaponData.data.attributes.weaponSummaries;
                // Descobrir a arma com mais abates ou nível maior
                let maxDefeats = -1;
                for (const [weaponName, weaponStats] of Object.entries(weapons)) {
                    if (weaponStats.StatsTotal.Defeats > maxDefeats) {
                        maxDefeats = weaponStats.StatsTotal.Defeats;
                        favWeapon = weaponName.replace('Item_Weapon_', '').replace('_C', '');
                    }
                }
            }
            
            return {
                nome: playerName,
                kd: realKd,
                arma: favWeapon
            };
        } catch (error) {
            console.error("Erro com " + playerName, error);
            return null;
        }
    }

    const stats = [];
    for (const player of SQUAD) {
        const data = await getPubgPlayerStats(player);
        if (data) stats.push(data);
    }

    if (stats.length === 0) {
        return res.status(400).json({ error: "Não foi possível buscar os dados de nenhum jogador no PUBG." });
    }

    // 3. Salvar no Discord
    const messageContent = JSON.stringify({
        type: 'SQUAD_STATS',
        updatedAt: new Date().toISOString(),
        members: stats
    });

    try {
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${DB_CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `\`\`\`json\n${messageContent}\n\`\`\``
            })
        });

        if (!discordRes.ok) {
            return res.status(discordRes.status).json({ error: "Falha ao gravar no Discord" });
        }

        return res.status(200).json({ success: true, message: "Banco de dados atualizado com estatísticas reais do PUBG!", atualizados: SQUAD.length });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
};
