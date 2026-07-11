exports.handler = async function(event, context) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_MEMBERS_CHANNEL_ID || '1525389139304906784';
    
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
        
        const members = data
            .map(msg => {
                const lines = msg.content.split('\n');
                let nome = "", funcao = "", kd = "", arma = "";
                
                lines.forEach(line => {
                    const lowerLine = line.toLowerCase();
                    if (lowerLine.startsWith('nome:')) nome = line.substring(5).trim();
                    else if (lowerLine.startsWith('função:') || lowerLine.startsWith('funcao:')) funcao = line.substring(7).trim();
                    else if (lowerLine.startsWith('kd:')) kd = line.substring(3).trim();
                    else if (lowerLine.startsWith('arma:')) arma = line.substring(5).trim();
                });

                if (!nome) return null; // "Nome" is required at least

                let imageUrl = null;
                if (msg.attachments && msg.attachments.length > 0) {
                    const imageAttachment = msg.attachments.find(att => att.content_type && att.content_type.startsWith('image/'));
                    if (imageAttachment) {
                        imageUrl = imageAttachment.url;
                    }
                }

                return {
                    nome,
                    funcao: funcao || "Membro",
                    kd: kd || "Desconhecido",
                    arma: arma || "Mão Livre",
                    imageUrl: imageUrl
                };
            })
            .filter(member => member !== null);
            
        // Inverte para mostrar os mais antigos (primeiras mensagens) primeiro, se preferir
        members.reverse();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ members })
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
