const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');

// Initialize OpenAI lazily to avoid crash if key is missing at startup
let openai;
const getOpenAI = () => {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is missing in .env file');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
};

// @desc    Chat with AI Waiter
// @route   POST /api/chat
// @access  Private
router.post('/', protect, async (req, res) => {
    const { message, history } = req.body;

    try {
        // 1. Fetch current menu for context
        const menuItems = await MenuItem.find({ isAvailable: true }).populate('category');
        
        const menuContext = menuItems.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            category: item.category.name,
            description: item.description
        }));

        const systemPrompt = `
You are a friendly and helpful AI Waiter at a modern cafe. 
Your goal is to help customers explore the menu, suggest items, and help them place orders.

CURRENT MENU:
${JSON.stringify(menuContext, null, 2)}

DIRECTIONS:
1. Be polite, welcoming, and act like a professional cafe waiter.
2. If a user asks for something sweet, suggest desserts. If they want caffeine, suggest coffees.
3. If a user wants to add an item to their order/cart, you MUST identify the exact item from the menu above.
4. When you want to add an item to the user's cart, include a special JSON tag at the end of your message in this format: [ACTION:ADD_TO_CART:{"id":"ITEM_ID","name":"ITEM_NAME","price":ITEM_PRICE}]
5. Only suggest items that are in the menu provided.
6. If an item is not in the menu, politely say we don't have it today.
        `;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-5), // Last 5 messages for context
            { role: 'user', content: message }
        ];

        if (!process.env.OPENAI_API_KEY) {
            console.error('MISSING OPENAI_API_KEY');
            return res.status(500).json({ message: "OpenAI API Key is missing. Please add it to your .env file." });
        }

        const aiClient = getOpenAI();
        const completion = await aiClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;

        res.json({ message: aiResponse });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ message: "I'm having a little trouble connecting to my brain right now. Please try again in a moment!" });
    }
});

module.exports = router;
