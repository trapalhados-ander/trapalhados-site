module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;
    const MEMBERS_CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "Faltam chaves de API na Vercel." });
    }

    // 1. Ler Membros Atuais do Canal de Membros (Nomes)
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
        console.error("Erro ao buscar membros", e);
    }

    if (SQUAD.length === 0) return res.status(400).json({ error: "Nenhum membro." });

    // 2. Ler Banco de Dados Atual para Manter os Antigos e Achar os Mais Desatualizados
    let currentDB = [];
    try {
        const dbRes = await fetch(`https://discord.com/api/v10/channels/${DB_CHANNEL_ID}/messages?limit=1`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });
        if (dbRes.ok) {
            const dbData = await dbRes.json();
            if (dbData.length > 0) {
                const content = dbData[0].content.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(content);
                if (parsed && parsed.members) currentDB = parsed.members;
            }
        }
    } catch (e) {
        console.error("Erro ao ler DB", e);
    }

    // Identificar quais 3 membros atualizar agora (para não estourar o limite de 10 reqs/min do PUBG)
    // Ordenar pelo mais antigo atualizado ou que ainda nem existe no DB
    let sortedSquad = SQUAD.map(nome => {
        const existing = currentDB.find(m => m.nome.toLowerCase() === nome.toLowerCase());
        return {
            nome: nome,
            lastUpdate: existing ? (existing.lastUpdate || 0) : 0
        };
    });
    
    sortedSquad.sort((a, b) => a.lastUpdate - b.lastUpdate);
    const toUpdate = sortedSquad.slice(0, 3).map(s => s.nome);

    const errors = [];
    const updatedStats = [];
    const namesChunk = toUpdate.join(',');
    
    // 3. Buscar os IDs no PUBG para esses 3
    let playerIds = {};
    const playerRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${namesChunk}`, {
        headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
    });
    
    if (playerRes.ok) {
        const data = await playerRes.json();
        if (data && data.data) {
            data.data.forEach(p => {
                playerIds[p.attributes.name.toLowerCase()] = p.id;
            });
        }
    } else {
        errors.push(`Erro ao buscar IDs: ${playerRes.status}`);
    }

    // 4. Buscar Stats (Max 3 jogadores = 6 requisições + 1 dos IDs = 7 requisições totais. Bem abaixo das 10 permitidas!)
    for (const player of toUpdate) {
        const accountId = playerIds[player.toLowerCase()];
        if (!accountId) {
            errors.push(`Nick não encontrado no PUBG Steam: ${player}`);
            continue;
        }

        try {
            const statsRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/seasons/lifetime`, {
                headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
            });

            if (!statsRes.ok) {
                errors.push(`Erro Stats ${player}: ${statsRes.status}`);
                continue;
            }

            const statsData = await statsRes.json();
            const squadFpp = statsData.data.attributes.gameModeStats['squad-fpp'] || {};
            const kills = squadFpp.kills || 0;
            const wins = squadFpp.wins || 0;
            const matches = squadFpp.roundsPlayed || 0;
            const deaths = matches - wins;
            
            let realKd = "0.00";
            if (deaths > 0) realKd = (kills / deaths).toFixed(2);
            else if (kills > 0) realKd = kills.toFixed(2);

            let favWeapon = "Desconhecida";
            const weaponRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/weapon_mastery`, {
                headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
            });

            if (weaponRes.ok) {
                const weaponData = await weaponRes.json();
                const weapons = weaponData.data.attributes.weaponSummaries;
                let maxDefeats = -1;
                for (const [weaponName, weaponStats] of Object.entries(weapons)) {
                    if (weaponStats.StatsTotal && weaponStats.StatsTotal.Defeats > maxDefeats) {
                        maxDefeats = weaponStats.StatsTotal.Defeats;
                        favWeapon = weaponName.replace('Item_Weapon_', '').replace('_C', '');
                    }
                }
            }

            updatedStats.push({
                nome: player,
                kd: realKd,
                arma: favWeapon,
                lastUpdate: Date.now()
            });

        } catch (error) {
            errors.push(`Erro interno ${player}: ${error.message}`);
        }
    }

    // 5. Mesclar os novos com os antigos
    let finalDB = [...currentDB];
    updatedStats.forEach(newStat => {
        const index = finalDB.findIndex(m => m.nome.toLowerCase() === newStat.nome.toLowerCase());
        if (index >= 0) finalDB[index] = newStat;
        else finalDB.push(newStat);
    });
    
    // Remover quem não está mais no SQUAD
    finalDB = finalDB.filter(m => SQUAD.includes(m.nome));

    // 6. Salvar no Discord
    const messageContent = JSON.stringify({
        type: 'SQUAD_STATS',
        updatedAt: new Date().toISOString(),
        members: finalDB
    });

    await fetch(`https://discord.com/api/v10/channels/${DB_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `\`\`\`json\n${messageContent}\n\`\`\`` })
    });

    return res.status(200).json({ 
        success: true, 
        message: "Banco atualizado em lotes inteligentes!", 
        processados_agora: toUpdate,
        erros_na_busca: errors,
        total_no_banco: finalDB.length
    });
};
