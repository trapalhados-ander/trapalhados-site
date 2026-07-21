module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;

    if (!PUBG_API_KEY || !DISCORD_BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "Faltam chaves de API na Vercel." });
    }

    // Lista temporária de exemplo. Numa versão futura, podemos cruzar com o próprio array do Discord
    const SQUAD = ['Player1', 'Player2']; 

    async function getPubgPlayerStats(playerName) {
        try {
            const playerRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`, {
                headers: {
                    'Authorization': `Bearer ${PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            
            if (!playerRes.ok) return null;
            const playerData = await playerRes.json();
            // Apenas para não falhar enquanto a API verdadeira é conectada em 100%
            
            return {
                nome: playerName,
                kd: (Math.random() * 3 + 1).toFixed(2), // Simulado
                arma: 'Beryl M762' // Simulado
            };
        } catch (error) {
            return null;
        }
    }

    const stats = [];
    for (const player of SQUAD) {
        const data = await getPubgPlayerStats(player);
        if (data) stats.push(data);
    }

    if (stats.length === 0) {
        return res.status(400).json({ error: "Não foi possível buscar os dados do PUBG." });
    }

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

        return res.status(200).json({ success: true, message: "Banco de dados do Discord atualizado com sucesso!" });
    } catch (error) {
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
};
