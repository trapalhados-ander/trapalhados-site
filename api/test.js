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
        const accountId = data.data[0].id;
        
        const statsRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/seasons/lifetime`, {
            headers: {
                'Authorization': `Bearer ${PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        
        const statsData = await statsRes.json();
        
        const weaponRes = await fetch(`https://api.pubg.com/shards/steam/players/${accountId}/weapon_mastery`, {
                headers: {
                    'Authorization': `Bearer ${PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });
            
        const weaponData = await weaponRes.json();
        
        return res.status(200).json({
            accountId,
            statsOk: statsRes.ok,
            statsStatus: statsRes.status,
            weaponOk: weaponRes.ok,
            stats: statsData,
            weapon: weaponData
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
