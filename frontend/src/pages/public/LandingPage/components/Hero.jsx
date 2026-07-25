export default function Hero() {
  return (
    <section className="w-full flex flex-col items-center justify-center text-center mb-10 sm:mb-12 animate-in fade-in slide-in-from-top-3 duration-500">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3 text-center w-full">
        What would you like{" "}
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-black">
          to reserve?
        </span>
      </h1>
      <div className="w-full flex justify-center text-center">
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl text-center leading-relaxed font-medium">
          Streamlined booking for University facilities and technical equipment. Choose your path to begin the reservation process.
        </p>
      </div>
    </section>
  );
}
