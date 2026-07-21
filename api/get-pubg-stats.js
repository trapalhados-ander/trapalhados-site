module.exports = async (req, res) => {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const DB_CHANNEL_ID = process.env.DISCORD_DB_CHANNEL_ID;
    
    if (!BOT_TOKEN || !DB_CHANNEL_ID) {
        return res.status(500).json({ error: "DISCORD_BOT_TOKEN or DISCORD_DB_CHANNEL_ID not configured" });
    }

    try {
        // Busca a última mensagem do canal
        const response = await fetch(`https://discord.com/api/v10/channels/${DB_CHANNEL_ID}/messages?limit=1`, {
            method: 'GET',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error("Discord API Error:", response.status, response.statusText);
            return res.status(response.status).json({ error: "Failed to fetch from Discord DB" });
        }

        const data = await response.json();
        
        if (data.length === 0) {
            return res.status(404).json({ error: "No data found in Discord DB" });
        }

        const latestMessage = data[0].embeds && data[0].embeds.length > 0 
            ? data[0].embeds[0].description 
            : data[0].content;
        
        // Remove a formatação do bloco de código ```json ... ```
        const jsonString = latestMessage.replace(/```json|```/g, '').trim();
        
        try {
            const statsData = JSON.parse(jsonString);
            res.status(200).json(statsData);
        } catch (parseError) {
            console.error("Failed to parse JSON from Discord message:", parseError);
            res.status(500).json({ error: "Invalid data format in Discord DB" });
        }
    } catch (error) {
        console.error("Function error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
