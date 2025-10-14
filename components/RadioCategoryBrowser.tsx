import type { RadioCategory } from '../types.ts';

interface RadioCategoryBrowserProps {
    categories: RadioCategory[];
    onSelectCategory: (category: RadioCategory) => void;
}

const RadioCategoryBrowser = ({ categories, onSelectCategory }: RadioCategoryBrowserProps) => {
    return (
        <div className="h-full w-full overflow-y-auto scroll-container p-6 pb-40">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Live Radio</h1>
                <p className="text-neutral-400">Discover stations from around the world</p>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                    <button
                        key={category.name}
                        onClick={() => onSelectCategory(category)}
                        className="relative aspect-square w-full rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-color)] focus:ring-[var(--primary-accent)]"
                    >
                        <img 
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <h2 className="absolute bottom-3 left-3 text-white font-bold text-lg">{category.name}</h2>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RadioCategoryBrowser;