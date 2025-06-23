interface PromptCategory {
  category: string;
  icon: string;
  prompts: string[];
}

export const indonesianTrendingPrompts: PromptCategory[] = [
  {
    category: "Teknologi & Digital",
    icon: "💻",
    prompts: [
      "Jelaskan tentang AI Generative yang sedang trending di Indonesia",
      "Bagaimana cara memulai bisnis online di era digital Indonesia?",
      "Tren teknologi fintech terbaru di Indonesia 2024",
      "Tips keamanan siber untuk UMKM Indonesia"
    ]
  },
  {
    category: "Bisnis & Ekonomi",
    icon: "💼",
    prompts: [
      "Strategi marketing digital untuk brand lokal Indonesia",
      "Peluang bisnis startup di Indonesia yang menjanjikan",
      "Cara mengembangkan UMKM di era ekonomi digital",
      "Analisis tren e-commerce Indonesia vs global"
    ]
  },
  {
    category: "Budaya & Lifestyle",
    icon: "🇮🇩",
    prompts: [
      "Tren kuliner Indonesia yang viral di media sosial",
      "Wisata lokal Indonesia yang instagramable",
      "Perkembangan musik pop Indonesia di kancah internasional",
      "Fashion sustainable dari brand lokal Indonesia"
    ]
  },
  {
    category: "Pendidikan & Karir",
    icon: "📚",
    prompts: [
      "Skill digital yang paling dibutuhkan di Indonesia 2024",
      "Tips interview kerja untuk fresh graduate Indonesia",
      "Peluang karir di industri kreatif Indonesia",
      "Cara belajar coding secara otodidak untuk pemula"
    ]
  },
  {
    category: "Kesehatan & Wellness",
    icon: "🏥",
    prompts: [
      "Tips hidup sehat dengan budget terbatas ala Indonesia",
      "Olahraga tradisional Indonesia yang bisa dilakukan di rumah",
      "Herbal Indonesia untuk meningkatkan imunitas tubuh",
      "Mental health awareness di kalangan milenial Indonesia"
    ]
  },
  {
    category: "Entertainment",
    icon: "🎬",
    prompts: [
      "Rekomendasi film Indonesia terbaik untuk weekend",
      "Tren konten kreator Indonesia di platform digital",
      "Game mobile populer yang dimainkan di Indonesia",
      "Podcast Indonesia yang wajib didengar untuk insight"
    ]
  }
];

export function getRandomPrompts(count: number = 4): string[] {
  const allPrompts = indonesianTrendingPrompts.flatMap(category => category.prompts);
  const shuffled = allPrompts.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getPromptsByCategory(category: string): string[] {
  const found = indonesianTrendingPrompts.find(cat => cat.category === category);
  return found ? found.prompts : [];
}

export function getAllCategories(): PromptCategory[] {
  return indonesianTrendingPrompts;
}