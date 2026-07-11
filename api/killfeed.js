module.exports = async (req, res) => {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = '1525364768251318457';
    
    if (!BOT_TOKEN) {
        return res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured" });
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error("Discord API Error:", response.status, response.statusText);
            return res.status(response.status).json({ error: "Failed to fetch from Discord" });
        }

        const data = await response.json();
        
        const messages = data
            .map(msg => msg.content)
            .filter(content => content.trim() !== "");

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Function error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
