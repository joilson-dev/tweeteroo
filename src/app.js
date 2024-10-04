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

        const user = await db.collection('users').findOne({ userName });

        if (!user) {
            return res.status(401).send('Usuário não cadastrado');
        }

        await db.collection('tweets').insertOne({ userName, tweet });

        return res.status(201).send('Tweet criado com sucesso');
    } catch (err) {
        return res.status(500).send(err);
    }
});

app.get('/tweets', async (req, res) => {
    try {
        const tweets = await db.collection('tweets')
            .find({})
            .sort({ _id: -1 })
            .toArray();

        if (tweets.length === 0) {
            return res.status(200).json([]);
        }

        const tweetsWithAvatar = await Promise.all(
            tweets.map(async tweet => {
                const user = await db.collection('users').findOne({ username: tweet.username });

                return {
                    _id: tweet._id,
                    username: tweet.username,
                    avatar: user ? user.avatar : '',
                    tweet: tweet.tweet,
                };
            }));

        return res.status(200).json(tweetsWithAvatar);
    } catch (err) {
        return res.status(500).send(err);
    }
});

app.put('/tweets/:id', async (req, res) => {
    const { id } = req.params;
    const { userName, tweet } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send('ID inválido');
    }

    const { error } = tweetSchema.validate({ userName, tweet }, { abortEarly: false });
    if (error) {
        return res.status(422).json({ errors: error.details.map(err => err.message) });
    }

    const user = await db.collection('users').findOne({ userName });
    if (!user) {
        return res.status(401).send('Usuário não cadastrado');
    }

    const findTweet = await db.collection('tweets').findOne({ _id: new ObjectId(id) });
    if (!findTweet) {
        return res.status(404).send('ID do tweet não encontrado!');
    }

    if (findTweet.userName !== userName) {
        return res.status(403).send('Você não tem permissão para editar este tweet');
    }

    await db.collection('tweets').updateOne({ _id: new ObjectId(id) }, { $set: { tweet } });

    return res.status(204).send();
});

app.delete('/tweets/:id', async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send('ID inválido');
    }

    const findIdTweet = await db.collection('tweets').findOne({ _id: new ObjectId(id) })

    if (!findIdTweet) {
        return res.status(404).send('ID do tweet não encontrado!');
    }

    try {
        const result = await db.collection('tweets').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) return res.sendStatus(404);

        res.status(204).send('Tweet deletado com sucesso');
    } catch (error) {
        res.status(500).send(error);
    }
});

app.listen(process.env.PORT, () => console.log(`Rodando na porta ${process.env.PORT}`))