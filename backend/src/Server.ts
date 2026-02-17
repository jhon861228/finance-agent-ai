import dotenv from 'dotenv';
dotenv.config();

import app from './App';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Try POST /api/commands with a CreateGroup payload`);
});
