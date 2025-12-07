const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 20
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 30,
    default: function() {
      return this.username;
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if not using Google OAuth
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  avatar: {
    type: String,
    default: function() {
      return `https://placehold.co/100/ff4500/white?text=${this.username?.charAt(0).toUpperCase() || 'U'}`;
    }
  },
  bio: {
    type: String,
    default: 'New Redditor',
    maxlength: 200
  },
  bannerColor: {
    type: String,
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  bannerUrl: {
    type: String,
    default: ''
  },
  karma: {
    type: Number,
    default: 1
  },
  cakeDay: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  // Only hash if not already hashed (bcrypt hashes start with $2)
  if (!this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Format karma for display
userSchema.methods.getFormattedKarma = function() {
  if (this.karma >= 1000000) return `${(this.karma / 1000000).toFixed(1)}M`;
  if (this.karma >= 1000) return `${(this.karma / 1000).toFixed(1)}k`;
  return String(this.karma);
};

// Format cake day for display
userSchema.methods.getFormattedCakeDay = function() {
  return this.cakeDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Don't return password in JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  obj.karma = this.getFormattedKarma();
  obj.cakeDay = this.getFormattedCakeDay();
  return obj;
};

// Indexes for faster queries
// Note: username and email already have indexes from unique: true
userSchema.index({ createdAt: -1 }); // For sorting by newest
userSchema.index({ displayName: 'text' }); // For searching by display name

module.exports = mongoose.model('User', userSchema);
