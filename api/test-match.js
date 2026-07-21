const fetch = require('node-fetch');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;

async function run() {
    // 1. Get player
    const pRes = await fetch('https://api.pubg.com/shards/steam/players?filter[playerNames]=Annder', {
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/vnd.api+json' }
    });
    const pData = await pRes.json();
    const matches = pData.data[0].relationships.matches.data;
    console.log("Found matches:", matches.length);
    
    if (matches.length > 0) {
        const matchId = matches[0].id;
        const mRes = await fetch(`https://api.pubg.com/shards/steam/matches/${matchId}`, {
            headers: { 'Accept': 'application/vnd.api+json' } // API key is optional for matches but good practice
        });
        const mData = await mRes.json();
        
        const mapName = mData.data.attributes.mapName;
        const gameMode = mData.data.attributes.gameMode;
        const createdAt = mData.data.attributes.createdAt;
        
        console.log(`Match: ${matchId} | Map: ${mapName} | Mode: ${gameMode} | Time: ${createdAt}`);
        
        // Find participant
        const included = mData.included;
        let participantId = null;
        let kills = 0;
        let rosterId = null;
        
        for (const item of included) {
            if (item.type === 'participant' && item.attributes.stats.name === 'Annder') {
                participantId = item.id;
                kills = item.attributes.stats.kills;
                console.log(`Participant Annder found! Kills: ${kills}`);
            }
        }
        
        // Find roster for participant
        let rank = 0;
        for (const item of included) {
            if (item.type === 'roster') {
                const participants = item.relationships.participants.data;
                if (participants.some(p => p.id === participantId)) {
                    rank = item.attributes.stats.rank;
                    const won = item.attributes.won;
                    console.log(`Roster found! Rank: ${rank} | Won: ${won}`);
                    console.log(`Squad members in this roster:`);
                    for (const p of participants) {
                        const pData = included.find(i => i.id === p.id);
                        if(pData) console.log(`- ${pData.attributes.stats.name}`);
                    }
                    break;
                }
            }
        }
    }
}

run().catch(console.error);
