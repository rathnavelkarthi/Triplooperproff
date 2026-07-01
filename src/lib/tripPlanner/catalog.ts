export interface CatalogProperty {
  id: number;
  name: string;
  city: string;
  type: string;
  nightlyRate: number;
  rating: string;
  image: string;
  tag: string;
  subdomain?: string;
}

export const CATALOG_PROPERTIES: CatalogProperty[] = [
  { id: 1, name: "Anya Paradise", city: "Pondicherry", type: "Luxury Beach Villa", nightlyRate: 6500, rating: "4.95", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80", tag: "Beachfront", subdomain: "anyaparadise" },
  { id: 2, name: "Coolspot Cottage", city: "Ooty", type: "Heritage Mountain Retreat", nightlyRate: 4200, rating: "4.89", image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80", tag: "Mountain View", subdomain: "coolspot-cottage" },
  { id: 3, name: "Jayam Castle", city: "Yercaud", type: "Boutique Forest Lodge", nightlyRate: 3800, rating: "4.90", image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80", tag: "Forest Edge", subdomain: "jayam-castle" },
  { id: 4, name: "Green Apple Property", city: "Madurai", type: "Premium Stay", nightlyRate: 3500, rating: "4.85", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", tag: "City Center", subdomain: "green-apple-property" },
  { id: 5, name: "Carvery Residency", city: "Pondicherry", type: "French Quarter Inn", nightlyRate: 5800, rating: "4.92", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", tag: "Heritage Quarter", subdomain: "carvery-residency" },
  { id: 6, name: "Royal Park", city: "Chennai", type: "Executive Suite", nightlyRate: 7200, rating: "4.88", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", tag: "Premium Suite", subdomain: "royal-park" },
  { id: 7, name: "Solitude Beach House", city: "Pondicherry", type: "Private Beachfront Villa", nightlyRate: 12000, rating: "4.98", image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80", tag: "Beachfront" },
  { id: 8, name: "Verdant Valley Resort", city: "Kodaikanal", type: "Hillside Plantation Villa", nightlyRate: 9500, rating: "4.94", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", tag: "Mountain View" },
  { id: 9, name: "Golden Crest Bistro & Inn", city: "Ooty", type: "Boutique Farmhouse", nightlyRate: 6000, rating: "4.91", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", tag: "Eco Stays" },
  { id: 10, name: "Moongil Illam Cottage", city: "Pondicherry", type: "Bamboo Design Villa", nightlyRate: 5200, rating: "4.87", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", tag: "Eco Stays", subdomain: "moongil-illam-cottage" },
  { id: 11, name: "Nest N Rest Cottage", city: "Ooty", type: "Cozy Wood Cabin", nightlyRate: 3900, rating: "4.83", image: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&q=80", tag: "Mountain View", subdomain: "nest-n-rest-cottage" },
  { id: 12, name: "Pineapple Nest", city: "Coimbatore", type: "Modern Loft Stay", nightlyRate: 4000, rating: "4.86", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", tag: "City Center", subdomain: "pineapple-nest" },
  { id: 13, name: "Sai Residency", city: "Ooty", type: "Classic Hill Cottage", nightlyRate: 4500, rating: "4.93", image: "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&q=80", tag: "Mountain View", subdomain: "sai-residency" },
  { id: 14, name: "Coral Reef Resort", city: "Pondicherry", type: "Coastal Luxury Stay", nightlyRate: 10500, rating: "4.96", image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&q=80", tag: "Beachfront" },
  { id: 15, name: "Emerald Glade Villa", city: "Yercaud", type: "Orchard Manor", nightlyRate: 8000, rating: "4.92", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", tag: "Eco Stays" },
  { id: 16, name: "Whispering Pines", city: "Kodaikanal", type: "Pine Ridge Cabin", nightlyRate: 5500, rating: "4.89", image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80", tag: "Mountain View" },
  { id: 17, name: "Pondy Heights", city: "Pondicherry", type: "Rooftop Pool Penthouse", nightlyRate: 6800, rating: "4.88", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80", tag: "Heritage Quarter" },
  { id: 18, name: "Hilltop Sanctuary", city: "Ooty", type: "Vintage Estate Bungalow", nightlyRate: 11000, rating: "4.97", image: "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800&q=80", tag: "Mountain View" },
  { id: 19, name: "Kaveri Breeze Hotel", city: "Tiruchirappalli", type: "Boutique Riverside Stay", nightlyRate: 3900, rating: "4.84", image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80", tag: "Heritage Quarter" },
  { id: 20, name: "Silver Linings Villa", city: "Coimbatore", type: "Luxury Foothill Villa", nightlyRate: 8500, rating: "4.91", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80", tag: "Eco Stays" },
];
