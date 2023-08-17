require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Airtable = require('airtable');
const cron = require('node-cron');

const app = express();
app.use(express.json());

const airtableBase = new Airtable({
    apiKey: process.env.SECRET_API_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

const trackedCoins = {};
const fetchAndRecordCoins = async () => {
    try {
        const coinGeckoResponse = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 20,
                page: 1,
            },
        });

        await Promise.all(coinGeckoResponse.data.map(async (coin) => {
            if (!trackedCoins[coin.id]) {
                const createdRecord = await airtableBase('Coins').create([
                    {
                        fields: {
                            name: coin.name,
                            symbol: coin.symbol,
                            current_price: coin.current_price,
                            market_cap: coin.market_cap,
                        },
                    },
                ]);
                trackedCoins[coin.id] = createdRecord.getId();
            }
        }));
    } catch (error) {
        console.error('Error:', error);
    }
};

fetchAndRecordCoins();

const updateCoinPrices = async () => {
    try {
        const coinGeckoResponse = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: Object.keys(trackedCoins).join(','),
                vs_currencies: 'usd',
            },
        });

        const coinPrices = coinGeckoResponse.data;
        for (const coinId in coinPrices) {
            await airtableBase('Coins').update([
                {
                    id: trackedCoins[coinId],
                    fields: {
                        current_price: coinPrices[coinId].usd,
                    },
                },
            ]);
        }
    } catch (err) {
        console.error(err);
    }
};

cron.schedule('*/20 * * * *', async () => {
    try {
        console.log('Fetched top 20 coins successfully!');
        fetchAndRecordCoins();
    } catch (err) {
        console.log('Error:', err);
    }
});

cron.schedule('1 * * * *', async () => {
    try {
        console.log('Updating prices...');
        updateCoinPrices();
    } catch (err) {
        console.log('Error:', err);
    }
});

app.get('/coins', async (req, res) => {
    try {
        console.log('GET /coins');
        const coinData = {};
        await airtableBase('Coins')
            .select({
                maxRecords: 20,
                view: 'Grid view',
            })
            .eachPage(function page(records, nextPage) {
                records.forEach(function (record) {
                    coinData[record.get('symbol')] = {
                        price: record.get('current_price'),
                    };
                });
                nextPage();
            });
        res.json(coinData);
    } catch (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/coins/price/:coinId', async (req, res) => {
    try {
        const coinId = req.params.coinId;
        console.log(`/coins/price/${coinId}`);

        const records = await airtableBase('Coins')
            .select({
                maxRecords: 1,
                filterByFormula: `{symbol} = "${coinId}"`,
            })
            .firstPage();
        if (records.length === 1) {
            const coinPrice = records[0].get('current_price');
            res.json({ coinId, price: coinPrice });
        } else {
            res.status(404).json({ error: 'Coin not found' });
        }
    } catch (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const SERVER_PORT = process.env.PORT || 3000;

app.listen(SERVER_PORT, () => {
    console.log(`Server is up and running on port: ${SERVER_PORT}`);
});
