module.exports = async (req, res) => {
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const MATCHES_CHANNEL_ID = '1529238301863837706'; 

    if (!DISCORD_BOT_TOKEN) return res.status(500).json({ error: "Falta Token do Discord." });

    try {
        const discordRes = await fetch(`https://discord.com/api/v10/channels/${MATCHES_CHANNEL_ID}/messages?limit=1`, {
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        });

        if (discordRes.ok) {
            const data = await discordRes.json();
            if (data.length > 0) {
                const content = data[0].content.replace(/```json|```/g, '').trim();
                return res.status(200).json(JSON.parse(content));
            }
        }
        return res.status(200).json({ history: [] });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
