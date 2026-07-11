exports.handler = async function(event, context) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = '1367866257809866864';
    
    if (!BOT_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "DISCORD_BOT_TOKEN not configured" })
        };
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
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "Failed to fetch from Discord" })
            };
        }

        const data = await response.json();
        
        // Extrai mensagens que possuem pelo menos 1 anexo de vídeo
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

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clips })
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
