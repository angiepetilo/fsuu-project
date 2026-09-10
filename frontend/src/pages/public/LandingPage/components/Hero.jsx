export default function Hero() {
  return (
    <section className="text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500 max-w-3xl mx-auto px-4 flex flex-col items-center">
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground mb-3 text-center">
        What would you like <span className="text-primary">to reserve?</span>
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed font-normal text-center tracking-normal text-balance">
        Official reservation system for University venues and technical equipment. Select a category below to submit or track your request.
      </p>
    </section>
  );
}
