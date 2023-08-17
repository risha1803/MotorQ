# MotorQ_Prisha_Sharma
In this code, I have tried to implement the MotorQ backend assignment task. 

1) Initially, I have installed all the modules and required dependencies.
2) Intialise the airtable and and an object called track coins.
3) Fetch and Record function - This function fetches coin data from the CoinGecko API and creates records for each coin in your Airtable base. It checks whether a coin has been processed before using the trackedCoins object.
4) Update Coin prices function - This function fetches updated coin prices from the CoinGecko API and updates the corresponding records in your Airtable base.
5) The Scheduled tasks - These lines schedule two tasks using node-cron. The first task fetches and records the top 20 coins' data every 10 minutes.
6) Then i have formed the 2 required API endpoints as per the requirement.
