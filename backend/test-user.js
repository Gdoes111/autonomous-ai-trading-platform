const mongoose = require('mongoose');

console.log('Mongoose available:', typeof mongoose);
console.log('Mongoose model function:', typeof mongoose.model);

try {
    const User = require('./src/models/User.js');
    console.log('User model loaded successfully');
    console.log('Export type:', typeof User);
    console.log('User constructor name:', User.constructor.name);
    console.log('User modelName:', User.modelName);
    console.log('Is mongoose model:', User instanceof mongoose.Model);
} catch (error) {
    console.error('Error loading User model:', error.message);
}
