// Each true claim is accompanied by the source shown after its reveal.
// The other two claims are deliberately invented for this game.
export const QUESTIONS = [
  {
    id: 'wombat', topic: 'ANIMAL KINGDOM',
    choices: ['Wombats make cube-shaped droppings.', 'Koalas make hexagonal droppings.', 'Kangaroos make spiral droppings.'],
    correct: 0,
    explanation: 'A wombat’s intestine shapes its droppings into cubes. The shape may help them stay put when marking territory.',
    source: { label: 'Smithsonian Magazine', url: 'https://www.smithsonianmag.com/smart-news/scientists-have-solved-mystery-how-wombats-poop-cubes-180976898/' },
    image: { path: '/assets/wombat.jpg', alt: 'The characteristically cube-shaped droppings of a wombat.', credit: 'SojournerRL / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Wombat_Faeces.jpg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' }
  },
  {
    id: 'venus', topic: 'SPACE ODDITIES',
    choices: ['One rotation of Mars takes longer than its year.', 'One rotation of Venus takes longer than its year.', 'One rotation of Mercury takes longer than its year.'],
    correct: 1,
    explanation: 'Venus takes about 243 Earth days to rotate once, but only about 225 Earth days to orbit the Sun.',
    source: { label: 'NASA Science', url: 'https://science.nasa.gov/venus/venus-facts/' },
    image: { path: '/assets/venus.jpg', alt: 'Venus photographed by NASA’s Mariner 10 spacecraft.', credit: 'NASA / Mariner 10', creditUrl: 'https://science.nasa.gov/venus/venus-facts/', license: 'NASA image', licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/' }
  },
  {
    id: 'octopus', topic: 'UNDER THE SEA',
    choices: ['An octopus has one heart in every arm.', 'An octopus has six hearts.', 'An octopus has three hearts.'],
    correct: 2,
    explanation: 'Two hearts pump blood through the gills; a third sends oxygenated blood around the body.',
    source: { label: 'Smithsonian Ocean', url: 'https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives' },
    image: { path: '/assets/octopus.jpg', alt: 'A common octopus resting among rocks.', credit: 'Amada44 / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Octopus_vulgaris_-_5915.jpg', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' }
  },
  {
    id: 'unicorn', topic: 'STRANGE SYMBOLS',
    choices: ['Scotland’s national animal is the unicorn.', 'Scotland’s national animal is the dragon.', 'Scotland’s national animal is the kelpie.'],
    correct: 0,
    explanation: 'The mythical unicorn is Scotland’s national animal and has appeared in Scottish heraldry for centuries.',
    source: { label: 'VisitScotland', url: 'https://www.visitscotland.com/things-to-do/attractions/arts-culture/myths-legends' },
    image: { path: '/assets/unicorn.jpg', alt: 'A carved Scottish unicorn on a historic building in Edinburgh.', credit: 'Pierre André Leclercq / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Edimbourg_The_Unicorn_of_Scotland.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  },
  {
    id: 'otter', topic: 'ANIMAL KINGDOM',
    choices: ['Sea otters keep prey inside their ears.', 'Sea otters stash prey in loose skin under their forearms.', 'Sea otters carry prey in a pouch at the tip of their tails.'],
    correct: 1,
    explanation: 'A sea otter has loose skin under each forearm that works like a pocket while it dives.',
    source: { label: 'Monterey Bay Aquarium', url: 'https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sea-otter' },
    image: { path: '/assets/sea-otter.jpg', alt: 'A sea otter floating on its back in an estuary.', credit: 'NOAA National Ocean Service', creditUrl: 'https://oceanservice.noaa.gov/facts/estuarylife.html', license: 'Public domain', licenseUrl: 'https://oceanservice.noaa.gov/about/faq.html' }
  },
  {
    id: 'frog', topic: 'WILD SURVIVAL',
    choices: ['Wood frogs turn into tadpoles again each winter.', 'Wood frogs build nests out of snowflakes.', 'Wood frogs can freeze in winter and thaw in spring.'],
    correct: 2,
    explanation: 'Wood frogs survive ice forming around their cells, then thaw and resume activity when it warms.',
    source: { label: 'U.S. National Park Service', url: 'https://www.nps.gov/kova/learn/nature/wood-frog.htm' },
    image: { path: '/assets/frog.jpg', alt: 'A wood frog among leaves and low plants.', credit: 'NPS / Emily Mesner', creditUrl: 'https://www.nps.gov/kova/learn/nature/wood-frog.htm', license: 'NPS photo', licenseUrl: 'https://www.nps.gov/aboutus/foia/copyrights.htm' }
  },
  {
    id: 'seahorse', topic: 'UNDER THE SEA',
    choices: ['Male seahorses carry eggs and give birth.', 'Male swordfish carry eggs and give birth.', 'Male clownfish carry eggs and give birth.'],
    correct: 0,
    explanation: 'In seahorses, the male carries developing eggs in a pouch and gives birth to the young.',
    source: { label: 'Smithsonian Ocean', url: 'https://ocean.si.edu/ocean-life/fish/longspine-seahorse' },
    image: { path: '/assets/seahorse.jpg', alt: 'A longsnout seahorse swimming underwater.', credit: 'Pauline Walsh Jacobson / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hippocampus_reidi_243970205.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }
  },
  {
    id: 'jellyfish', topic: 'WILD SURVIVAL',
    choices: ['A jellyfish can become a sea anemone when hungry.', 'A jellyfish can revert from an adult to a juvenile stage.', 'A jellyfish can grow back from a drop of seawater.'],
    correct: 1,
    explanation: 'Under stress, the species Turritopsis dohrnii can return to an earlier life stage and start its cycle again.',
    source: { label: 'Smithsonian Magazine', url: 'https://www.smithsonianmag.com/smart-news/immortal-jellyfish-could-spur-discoveries-about-human-aging-180980702/' },
    image: { path: '/assets/jellyfish.jpg', alt: 'A small Turritopsis dohrnii jellyfish swimming in water.', credit: 'Bachware / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Turritopsis_dohrnii.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  },
  {
    id: 'titan', topic: 'SPACE ODDITIES',
    choices: ['Saturn’s moon Titan has lakes of molten sulfur.', 'Saturn’s moon Titan has lakes of dry ice.', 'Saturn’s moon Titan has lakes of liquid methane and ethane.'],
    correct: 2,
    explanation: 'Titan has lakes and seas of liquid hydrocarbons, including methane and ethane.',
    source: { label: 'NASA Science', url: 'https://science.nasa.gov/saturn/moons/titan/facts/' },
    image: { path: '/assets/titan.jpg', alt: 'Saturn’s moon Titan photographed by the Cassini spacecraft.', credit: 'NASA / JPL-Caltech / Space Science Institute', creditUrl: 'https://science.nasa.gov/saturn/moons/titan/facts/', license: 'NASA image', licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/' }
  },
  {
    id: 'bloodfalls', topic: 'EARTH IS WEIRD',
    choices: ['Antarctica’s Blood Falls is red because of iron-rich brine.', 'Antarctica’s Blood Falls is red because of molten lava.', 'Antarctica’s Blood Falls is red because of a yearly algae bloom.'],
    correct: 0,
    explanation: 'Iron-rich brine seeps from beneath Taylor Glacier and colors the outflow red.',
    source: { label: 'U.S. National Science Foundation', url: 'https://par.nsf.gov/servlets/purl/10328233' },
    image: { path: '/assets/blood-falls.jpg', alt: 'Red-stained Blood Falls flowing out of ice in Antarctica.', credit: 'U.S. Department of State / Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:Blood_Falls_in_the_McMurdo_Dry_Valleys_in_Antarctica_(30877662646).jpg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File:Blood_Falls_in_the_McMurdo_Dry_Valleys_in_Antarctica_(30877662646).jpg' }
  }
];
