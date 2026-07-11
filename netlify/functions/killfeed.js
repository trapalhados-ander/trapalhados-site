exports.handler = async function(event, context) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = '1525364768251318457';
    
    if (!BOT_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "DISCORD_BOT_TOKEN not configured" })
        };
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
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "Failed to fetch from Discord" })
            };
        }

        const data = await response.json();
        
        // Extrai apenas o texto das mensagens e remove as vazias
        const messages = data
            .map(msg => msg.content)
            .filter(content => content.trim() !== "");

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
