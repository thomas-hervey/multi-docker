const keys = require('./keys')

// Express App setup
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors()) // Cross-Origin Resource Sharing link
app.use(bodyParser.json()) // Parse incoming React post into JSON value that Express API can use

// Postgres Client Setup
const { Pool } = require('pg')
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
})
pgClient.on('error', () => console.log('Lost PG connection'))

// create Postgres table
pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch((err) => console.log(err))


// Redis client setup
const redis = require('redis')
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPORT,
  retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate() // create another connection

// Express route handlers
app.get('/', (req, res) => {
  res.send('Hi')
})

app.get('values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values')

  res.send(values.rows) // return values
})

app.get('/values/current', async (req, res) => {
  // NOTE: no promise support out of the box, which is why we are using a callback instead of 'await'
  redisClient.hgetall('values', (err, values) => {
    res.send(values)
  })
})

app.post('/values', async (req, res) => {
  const index = req.body.index

  // cap index size so worker doesn't crash with large calculation
  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high')
  }

  redisClient.hset('values', index, 'Nothing yet!') // no calculations yet for this index
  redisPublisher.publish('insert', index) // insert event for the index
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]) // save index into pg

  res.send({ working: true })
})

app.listen(5000, err => {
  console.log('Listening')
})