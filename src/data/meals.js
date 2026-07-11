export const SEED_MEALS = [
  {
    id: 'm1', name: 'Scrambled eggs, cheese & spinach', slot: 'Breakfast',
    cost: 2.50, protein: 'eggs', prepTime: 10, favorite: false,
    items: [{ n: 'Eggs', s: 'Aldi' }, { n: 'Cheese', s: 'Aldi' }, { n: 'Spinach', s: 'Aldi' }],
    steps: [
      'Crack 3 eggs into a bowl, season with salt and pepper, and whisk well.',
      'Heat a non-stick pan over medium-low heat and add a small knob of butter.',
      'Add a handful of fresh spinach and stir until wilted, about 1 minute.',
      'Pour in the eggs and gently fold with a spatula as they cook. Remove from heat while still slightly wet.',
      'Top with shredded cheese and serve immediately.'
    ]
  },
  {
    id: 'm2', name: 'Boiled eggs', slot: 'Breakfast',
    cost: 1.50, protein: 'eggs', prepTime: 12, favorite: false,
    items: [{ n: 'Eggs', s: 'Aldi' }],
    steps: [
      'Bring a pot of water to a full boil.',
      'Gently lower eggs in with a spoon. Soft boiled: 6-7 minutes. Hard boiled: 10-12 minutes.',
      'Transfer eggs to a bowl of ice water for 5 minutes.',
      'Peel and serve with salt and pepper.'
    ]
  },
  {
    id: 'm3', name: 'Eggs, sausage and spinach', slot: 'Breakfast',
    cost: 3.00, protein: 'sausage', prepTime: 15, favorite: false,
    items: [{ n: 'Eggs', s: 'Aldi' }, { n: 'Sausage', s: 'Aldi' }, { n: 'Spinach', s: 'Aldi' }],
    steps: [
      'Slice sausage into rounds. Cook in a skillet over medium heat until browned on both sides, about 5 minutes. Set aside.',
      'In the same pan, wilt a handful of spinach for 1 minute.',
      'Crack in 2-3 eggs. Cover and cook until whites are set, about 3 minutes.',
      'Plate with sausage alongside. Season with salt and pepper.'
    ]
  },
  {
    id: 'm4', name: 'Yogurt, fruit & granola', slot: 'Breakfast',
    cost: 2.50, protein: 'dairy', prepTime: 5, favorite: false,
    items: [{ n: 'Yogurt', s: 'Aldi' }, { n: 'Bananas/apples', s: 'Aldi' }],
    steps: [
      'Spoon plain or vanilla yogurt into a bowl.',
      'Slice a banana or dice half an apple and add on top.',
      'Sprinkle granola over everything.',
      'Optional: drizzle with a little honey.'
    ]
  },
  {
    id: 'm5', name: 'Chicken taco bowls', slot: 'Dinner',
    cost: 4.00, protein: 'chicken', prepTime: 30, favorite: true,
    items: [
      { n: 'Chicken thighs', s: 'Costco' }, { n: 'Rice', s: 'Pantry' },
      { n: 'Lettuce & tomatoes', s: 'Aldi' }, { n: 'Salsa', s: 'Aldi' }
    ],
    steps: [
      'Cook rice according to package directions.',
      'Season chicken thighs generously with taco seasoning on both sides.',
      'Cook chicken in a skillet over medium-high heat, 6-7 minutes per side until cooked through. Rest 5 minutes then shred.',
      'Build bowls: rice on the bottom, then chicken, then toppings. Add salsa.'
    ]
  },
  {
    id: 'm6', name: 'Chicken quesadillas', slot: 'Dinner',
    cost: 3.50, protein: 'chicken', prepTime: 20, favorite: true,
    items: [{ n: 'Chicken thighs', s: 'Costco' }, { n: 'Cheese', s: 'Aldi' }, { n: 'Tortillas', s: 'Aldi' }],
    steps: [
      'Season and cook chicken thighs in a skillet until cooked through. Shred with two forks.',
      'Lay a tortilla flat. Add shredded chicken and a generous handful of cheese on one half.',
      'Fold the tortilla over and press down.',
      'Cook in a dry skillet over medium heat, 2-3 minutes per side, until golden and crispy.',
      'Slice into wedges and serve with salsa or sour cream.'
    ]
  },
  {
    id: 'm7', name: 'Crockpot pot roast', slot: 'Dinner',
    cost: 6.00, protein: 'beef', prepTime: 20, favorite: false,
    items: [
      { n: 'Chuck roast', s: 'Aldi' }, { n: 'Carrots', s: 'Aldi' },
      { n: 'Potatoes', s: 'Aldi' }, { n: 'Onions', s: 'Aldi' }
    ],
    steps: [
      'Season chuck roast all over with salt, pepper, and garlic powder.',
      'Optional: sear the roast in a hot skillet with oil, 3 minutes per side.',
      'Place carrots, potato chunks, and sliced onion in the bottom of the slow cooker.',
      'Set the roast on top. Add 1 cup of beef broth.',
      'Cook on LOW for 8 hours or HIGH for 4-5 hours until meat falls apart.',
      'Shred the meat with forks right in the pot and stir everything together.'
    ]
  },
  {
    id: 'm8', name: 'Beef bowls (leftover pot roast)', slot: 'Dinner',
    cost: 2.00, protein: 'beef', prepTime: 10, favorite: false,
    items: [{ n: 'Pot roast leftovers', s: 'Pantry' }, { n: 'Spinach or broccoli', s: 'Aldi' }],
    steps: [
      'Reheat leftover pot roast in a skillet over medium heat, or microwave for 2 minutes.',
      'Steam or sauté spinach or broccoli for 3-4 minutes until tender.',
      'Build a bowl: greens on the bottom, beef and vegetables on top.',
      'Spoon some of the pot roast juices over everything as a sauce.'
    ]
  },
  {
    id: 'm9', name: 'Breakfast for dinner', slot: 'Dinner',
    cost: 3.00, protein: 'sausage', prepTime: 20, favorite: false,
    items: [
      { n: 'Eggs', s: 'Aldi' }, { n: 'Sausage', s: 'Aldi' },
      { n: 'Spinach', s: 'Aldi' }, { n: 'Pancake mix', s: 'Aldi' }
    ],
    steps: [
      'Cook sausage links or patties in a skillet over medium heat until cooked through.',
      'While sausage cooks, make pancakes according to package directions.',
      'Scramble or fry eggs to your liking.',
      'Serve everything together on one plate with wilted spinach on the side.'
    ]
  },
  {
    id: 'm10', name: 'Chicken and rice casserole', slot: 'Dinner',
    cost: 5.00, protein: 'chicken', prepTime: 15, favorite: false,
    items: [
      { n: 'Chicken thighs', s: 'Costco' }, { n: 'Rice', s: 'Pantry' },
      { n: 'Broccoli', s: 'Aldi' }, { n: 'Cheese', s: 'Aldi' }
    ],
    steps: [
      'Preheat oven to 375°F.',
      'In a 9x13 baking dish, combine 1.5 cups uncooked rice, 3 cups chicken broth, and broccoli florets.',
      'Season chicken thighs with salt, pepper, and garlic powder. Lay on top of the rice.',
      'Cover tightly with foil and bake for 45 minutes.',
      'Uncover, add shredded cheese on top, and bake another 10 minutes until bubbly.'
    ]
  },
  {
    id: 'm11', name: 'Chicken wrap, fruit & popcorn', slot: 'Lunch',
    cost: 3.00, protein: 'chicken', prepTime: 10, favorite: false,
    items: [
      { n: 'Chicken thighs', s: 'Costco' }, { n: 'Tortillas', s: 'Aldi' },
      { n: 'Bananas/apples', s: 'Aldi' }, { n: 'Popcorn', s: 'Costco' }
    ],
    steps: [
      'Use pre-cooked or leftover chicken. Shred or slice it.',
      'Warm a tortilla for 20 seconds in the microwave.',
      'Layer chicken down the center with any veggies or sauce.',
      'Roll up and slice in half. Serve with a piece of fruit and a handful of popcorn.'
    ]
  },
  {
    id: 'm12', name: 'Chicken salad sandwich', slot: 'Lunch',
    cost: 3.00, protein: 'chicken', prepTime: 10, favorite: false,
    items: [{ n: 'Canned chicken', s: 'Aldi' }, { n: 'Bread', s: 'Aldi' }, { n: 'Bananas/apples', s: 'Aldi' }],
    steps: [
      'Drain a can of chicken completely.',
      'Mix with 2 tablespoons mayo, a squeeze of mustard, salt, and pepper.',
      'Spread on bread and top with lettuce if available.',
      'Serve with a piece of fruit and crackers on the side.'
    ]
  },
  {
    id: 'm13', name: 'Pot roast sandwich', slot: 'Lunch',
    cost: 2.50, protein: 'beef', prepTime: 5, favorite: false,
    items: [{ n: 'Pot roast leftovers', s: 'Pantry' }, { n: 'Bread', s: 'Aldi' }],
    steps: [
      'Reheat leftover pot roast in the microwave for 1-2 minutes.',
      'Pile the beef and any leftover vegetables onto bread.',
      'Add a spoonful of the juices for a French dip style.',
    ]
  },
  {
    id: 'm14', name: 'Turkey sandwich', slot: 'Lunch',
    cost: 3.00, protein: 'turkey', prepTime: 5, favorite: false,
    items: [{ n: 'Turkey', s: 'Aldi' }, { n: 'Bread', s: 'Aldi' }, { n: 'Cheese', s: 'Aldi' }],
    steps: [
      'Layer turkey slices and cheese on bread.',
      'Add lettuce, tomato, and condiments of your choice.',
      'For a snack box: skip the bread and arrange turkey, cheese, and crackers on a plate.'
    ]
  },
  {
    id: 'm15', name: 'Fruit with peanut butter', slot: 'Snack',
    cost: 1.00, protein: 'pb', prepTime: 3, favorite: false,
    items: [{ n: 'Peanut butter', s: 'Aldi' }, { n: 'Bananas/apples', s: 'Aldi' }],
    steps: ['Slice an apple into wedges or peel a banana.', 'Serve with a few tablespoons of peanut butter for dipping.']
  },
  {
    id: 'm16', name: 'Crispy baked chicken thighs', slot: 'Dinner',
    cost: 5.00, protein: 'chicken', prepTime: 15, favorite: true,
    items: [
      { n: 'Chicken thighs', s: 'Costco' }, { n: 'Rice', s: 'Pantry' }, { n: 'Broccoli', s: 'Aldi' }
    ],
    steps: [
      'Preheat oven to 425°F.',
      'Pat chicken thighs dry with paper towels — this is the key to crispy skin.',
      'Season all over with salt, pepper, garlic powder, and paprika.',
      'Place skin-side up on a baking sheet. Bake 35-40 minutes until skin is golden and crispy.',
      'While chicken bakes, cook rice and steam broccoli.',
      'Serve everything together.'
    ]
  },
  {
    id: 'm17', name: 'One skillet smoked sausage', slot: 'Breakfast',
    cost: 4.00, protein: 'sausage', prepTime: 25, favorite: false,
    items: [
      { n: 'Smoked sausage', s: 'Aldi' }, { n: 'Potatoes', s: 'Aldi' }, { n: 'Bell peppers', s: 'Aldi' }
    ],
    steps: [
      'Dice potatoes into small cubes so they cook fast.',
      'Slice smoked sausage into rounds and dice bell peppers.',
      'Heat oil in a large skillet over medium-high heat. Add potatoes, season with salt and paprika. Cook 10-12 minutes until golden.',
      'Add sausage and bell peppers. Cook another 5-6 minutes until browned.',
      'Serve hot straight from the skillet.'
    ]
  }
];

export const PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];
export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const PANTRY_CATEGORIES = ['Produce', 'Vegetables', 'Dairy', 'Meat', 'Fish/Seafood', 'Pantry Staples', 'Frozen'];
export const STORES = ['Aldi', 'Walmart', 'Costco', "Sam's Club", 'Trader Joe\'s', 'Kroger', 'Other'];

export const PROTEIN_OPTIONS = [
  { group: 'Meat & Seafood', items: ['Chicken', 'Beef', 'Pork', 'Turkey', 'Sausage', 'Fish/Seafood', 'Shrimp'] },
  { group: 'Vegetarian / Vegan', items: ['Eggs', 'Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Black beans', 'Veggie burger'] },
  { group: 'Dairy & Other', items: ['Cheese/Dairy', 'Peanut butter', 'No preference'] },
];
