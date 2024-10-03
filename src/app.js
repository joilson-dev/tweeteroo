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
    username: Joi.string().required(),
    avatar: Joi.string().uri().required(),
});


app.post('/sign-up', async (req, res) => {
    const { username, avatar } = req.body;


    const { error } = userSchema.validate({ username, avatar }, { abortEarly: false });

    if (error) {
        return res.status(422).json({ errors: error.details.map(err => err.message) });
    }

    try {
        await db.collection('users').insertOne({ username, avatar });
        return res.status(201).send('Usuário criado com sucesso');
    } catch (err) {
        return res.status(500).send('Erro ao salvar usuário');
    }
});



app.listen(process.env.PORT, () => console.log(`Rodando na porta ${process.env.PORT}`))