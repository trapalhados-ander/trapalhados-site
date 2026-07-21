module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;
    const MEMBERS_CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "Faltam chaves de API na Vercel." });
    }

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

    const stats = [];
    const errors = [];

    // Pegar IDs de todos os jogadores em Lotes de 6 (limite do PUBG)
    const playerIds = {};
    for (let i = 0; i < SQUAD.length; i += 6) {
        const chunk = SQUAD.slice(i, i + 6);
        const names = chunk.join(',');
        
        const playerRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${names}`, {
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
            errors.push(`Erro ao buscar IDs do lote: ${names}. Status: ${playerRes.status}`);
        }
    }

    // Buscar Stats para quem achamos ID
    for (const player of SQUAD) {
        const accountId = playerIds[player.toLowerCase()];
        if (!accountId) {
            errors.push(`Account ID não encontrado para: ${player}`);
            continue;
        }

        try {
            const statsRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/seasons/lifetime`, {
                headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
            });

            if (!statsRes.ok) {
                if (statsRes.status === 429) errors.push("Rate Limit (429) excedido nas estatísticas!");
                errors.push(`Erro ao buscar Lifetime Stats de ${player}. Status: ${statsRes.status}`);
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
            
            // Pausa rápida para tentar driblar rate limit
            await new Promise(r => setTimeout(r, 200));

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
            } else if (weaponRes.status === 429) {
                errors.push("Rate Limit (429) excedido nas armas!");
            }

            stats.push({
                nome: player,
                kd: realKd,
                arma: favWeapon
            });

        } catch (error) {
            errors.push(`Erro interno no jogador ${player}: ${error.message}`);
        }
    }

    // Sempre tentar salvar, mesmo se tiver poucos para não zerar o banco
    if (stats.length > 0) {
        const messageContent = JSON.stringify({
            type: 'SQUAD_STATS',
            updatedAt: new Date().toISOString(),
            members: stats,
            erros_da_ultima_rodada: errors
        });

        await fetch(`https://discord.com/api/v10/channels/${DB_CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `\`\`\`json\n${messageContent}\n\`\`\`` })
        });
    }

    return res.status(200).json({ 
        success: true, 
        message: "Robô finalizou a varredura.", 
        atualizados: stats.length, 
        erros: errors 
    });
};
