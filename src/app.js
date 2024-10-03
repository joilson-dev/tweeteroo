import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import Joi from 'joi'

dotenv.config();
const app = express();
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI)

let db;
const connectToDatabase = async () => {
    try {
        await client.connect();
        db = client.db();
        console.log('Conectado ao MongoDB');
    } catch (error) {
        console.error(error);
    }
};
connectToDatabase();


const userSchema = Joi.object({
    userName: Joi.string().required(),
    avatar: Joi.string().uri().required(),
});

const tweetSchema = Joi.object({
    userName: Joi.string().required(),
    tweet: Joi.string().required(),
});


app.post('/sign-up', async (req, res) => {
    const { userName, avatar } = req.body;


    const { error } = userSchema.validate({ userName, avatar }, { abortEarly: false });

    if (error) {
        return res.status(422).json({ errors: error.details.map(err => err.message) });
    }

    try {
        await db.collection('users').insertOne({ userName, avatar });
        return res.status(201).send('Usuário criado com sucesso');
    } catch (err) {
        return res.status(500).send('Erro ao salvar usuário');
    }
});

app.post('/tweets', async (req, res) => {
    const { userName, tweet } = req.body
    const { error } = tweetSchema.validate({ userName, tweet }, { abortEarly: false })

    if (error) {
        return res.status(422).json({ errors: error.details.map(err => err.message) });
    }

    try {

        const user = await db.collection('users').findOne({ username: userName });

        if (!user) {
            return res.status(401).send('Usuário não cadastrado');
        }

        await db.collection('tweets').insertOne({ username: userName, tweet, avatar: user.avatar });

        return res.status(201).send('Tweet criado com sucesso');
    } catch (err) {
        return res.status(500).send(err);
    }
});

app.listen(process.env.PORT, () => console.log(`Rodando na porta ${process.env.PORT}`))