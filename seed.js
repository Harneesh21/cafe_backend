const mongoose = require('mongoose');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
require('dotenv').config();
const fs = require('fs');

const logError = (err) => {
    fs.appendFileSync('seed_error.log', err.stack || err.message || JSON.stringify(err));
    fs.appendFileSync('seed_error.log', '\n\n');
};

const categories = [
    { name: 'Coffee', description: 'Freshly brewed coffee' },
    { name: 'Snacks', description: 'Tasty bites' },
    { name: 'Desserts', description: 'Sweet treats' }
];

const menuItems = [
    { name: 'Cappuccino', description: 'Classic Italian coffee', price: 4.5, categoryName: 'Coffee', image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53a?w=400' },
    { name: 'Croissant', description: 'Buttery and flaky', price: 3.0, categoryName: 'Snacks', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
    { name: 'Cheesecake', description: 'Rich and creamy', price: 5.5, categoryName: 'Desserts', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400' }
];

const User = require('./models/User');

const users = [
    { name: 'Admin User', email: 'admin@cafe.com', password: 'password123', role: 'admin' },
    { name: 'Staff User', email: 'staff@cafe.com', password: 'password123', role: 'staff' },
    { name: 'Customer User', email: 'customer@cafe.com', password: 'password123', role: 'customer' }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        await Category.deleteMany({});
        await MenuItem.deleteMany({});
        await User.deleteMany({});

        console.log('Inserting default users...');
        for (const u of users) {
            try {
                console.log(`Creating user: ${u.email}`);
                await User.create(u);
                console.log(`Successfully created user: ${u.email}`);
            } catch (userErr) {
                console.error(`FAILED to create user ${u.email}:`, userErr.message);
                throw userErr;
            }
        }
        console.log('Users seeded');

        const createdCategories = await Category.insertMany(categories);
        console.log('Categories seeded');

        const itemsToInsert = menuItems.map(item => {
            const cat = createdCategories.find(c => c.name === item.categoryName);
            return { ...item, category: cat._id };
        });

        await MenuItem.insertMany(itemsToInsert);
        console.log('Menu items seeded');

        process.exit();
    } catch (err) {
        console.error(err);
        logError(err);
        process.exit(1);
    }
};

seedDB();
