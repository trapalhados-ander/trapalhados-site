module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;
    const MEMBERS_CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "Faltam chaves de API na Vercel." });
    }

    // 1. Ler Membros Atuais do Canal de Membros (Nome e Apelido)
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
                let apelido = "";
                lines.forEach(line => {
                    const lower = line.toLowerCase();
                    if (lower.startsWith('nome:')) nome = line.substring(5).trim();
                    if (lower.startsWith('apelido:')) apelido = line.substring(8).trim();
                });
                
                // Se não tiver o campo "Apelido", usamos o próprio Nome como padrão de busca
                if (nome) {
                    SQUAD.push({
                        nome: nome,
                        apelido: apelido || nome
                    });
                }
            });
        }
    } catch (e) {
        console.error("Erro ao buscar membros", e);
    }

    if (SQUAD.length === 0) return res.status(400).json({ error: "Nenhum membro." });

    // 2. Ler Banco de Dados Atual
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

    // 3. Identificar quais 3 membros atualizar (ordenar pelos mais antigos)
    let sortedSquad = SQUAD.map(member => {
        const existing = currentDB.find(m => m.nome.toLowerCase() === member.nome.toLowerCase());
        return {
            nome: member.nome,
            apelido: member.apelido,
            lastUpdate: existing ? (existing.lastUpdate || 0) : 0
        };
    });
    
    sortedSquad.sort((a, b) => a.lastUpdate - b.lastUpdate);
    const toUpdate = sortedSquad.slice(0, 3); // Pegamos os 3 objetos

    const errors = [];
    const updatedStats = [];
    // Usamos os Apelidos (PUBG nicks) para a API
    const namesChunk = toUpdate.map(s => s.apelido).join(',');
    
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

    // 4. Buscar Stats
    for (const playerObj of toUpdate) {
        const accountId = playerIds[playerObj.apelido.toLowerCase()];
        if (!accountId) {
            errors.push(`Apelido não encontrado no PUBG Steam: ${playerObj.apelido} (Nome: ${playerObj.nome})`);
            continue;
        }

        try {
            const statsRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/seasons/lifetime`, {
                headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
            });

            if (!statsRes.ok) {
                errors.push(`Erro Stats ${playerObj.apelido}: ${statsRes.status}`);
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

            // Salvamos com o NOME real para o site cruzar, mas mantemos o Apelido pro log
            updatedStats.push({
                nome: playerObj.nome,
                apelido: playerObj.apelido,
                kd: realKd,
                arma: favWeapon,
                lastUpdate: Date.now()
            });

        } catch (error) {
            errors.push(`Erro interno ${playerObj.nome}: ${error.message}`);
        }
    }

    // 5. Mesclar com o banco atual
    let finalDB = [...currentDB];
    updatedStats.forEach(newStat => {
        const index = finalDB.findIndex(m => m.nome.toLowerCase() === newStat.nome.toLowerCase());
        if (index >= 0) finalDB[index] = newStat;
        else finalDB.push(newStat);
    });
    
    // Remover quem não está mais na lista principal do Discord
    finalDB = finalDB.filter(m => SQUAD.some(s => s.nome.toLowerCase() === m.nome.toLowerCase()));

    // 6. Salvar no DB Channel
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
        processados_agora: toUpdate.map(t => `${t.nome} -> ${t.apelido}`),
        erros_na_busca: errors,
        total_no_banco: finalDB.length
    });
};
