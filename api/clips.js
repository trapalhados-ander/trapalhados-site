module.exports = async (req, res) => {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = '1367866257809866864';
    
    if (!BOT_TOKEN) {
        return res.status(500).json({ error: "DISCORD_BOT_TOKEN not configured" });
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`, {
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
        
        const clips = data
            .filter(msg => msg.attachments && msg.attachments.length > 0)
            .map(msg => {
                const videoAttachment = msg.attachments.find(att => att.content_type && att.content_type.startsWith('video/'));
                if (videoAttachment) {
                    return {
                        title: msg.content || "Clipe sem título",
                        author: msg.author ? msg.author.global_name || msg.author.username : "Desconhecido",
                        videoUrl: videoAttachment.url,
                        proxyUrl: videoAttachment.proxy_url
                    };
                }
                return null;
            })
            .filter(clip => clip !== null);

        res.status(200).json({ clips });
    } catch (error) {
        console.error("Function error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
