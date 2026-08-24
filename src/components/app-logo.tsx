import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? 30 : size === "lg" ? 46 : 38;
  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Isotipo real de NickPharma sobre fondo blanco (se ve bien en light/dark) */}
      <div
        className="shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        <img
          src="/nickpharma-icon.png"
          alt="NickPharma"
          width={dim}
          height={dim}
          className="h-full w-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-extrabold tracking-tight", textSize)}>
            <span className="text-primary">Nick</span>
            <span className="text-emerald-600 dark:text-emerald-400">Pharma</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            Cuidamos de ti
          </span>
        </div>
      )}
    </div>
  );
}
