module.exports = async (req, res) => {
    const PUBG_API_KEY = process.env.PUBG_API_KEY;
    const playerName = req.query.name || 'Annder';

    try {
        const playerRes = await fetch(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`, {
            headers: {
                'Authorization': `Bearer ${PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        
        const data = await playerRes.json();
        return res.status(playerRes.status).json({
            status: playerRes.status,
            ok: playerRes.ok,
            data: data
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
