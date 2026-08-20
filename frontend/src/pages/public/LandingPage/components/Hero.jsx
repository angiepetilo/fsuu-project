export default function Hero() {
  return (
    <section className="text-center mb-10 sm:mb-14 animate-in fade-in slide-in-from-top-5 duration-700 max-w-3xl mx-auto px-4 flex flex-col items-center">
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 mb-4 text-center">
        What would you like{" "}
        <span className="bg-gradient-to-br from-blue-600 to-violet-600 bg-clip-text text-transparent">
          to reserve?
        </span>
      </h1>
      <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed font-medium text-center tracking-normal text-balance">
        Streamlined booking for University facilities and technical equipment. Choose your path to begin the reservation process.
      </p>
    </section>
  );
}

