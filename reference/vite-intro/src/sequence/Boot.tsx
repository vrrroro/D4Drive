import { useRef, useState } from "react";
import { LogoLoader } from "./LogoLoader";
import { CarStage, type CarStageHandle } from "./CarStage";
import { LoginPanel, type Role } from "./LoginPanel";
import { CAR, INTRO_SEEN_KEY } from "@/lib/sequence";
import { runParticles } from "@/fx/particle-stage";
import { cn } from "@/lib/cn";

type Phase = "logo" | "approach" | "login" | "depart" | "scatter";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  onFinish: (role: Role) => void;
}

/**
 * The opening film, start to finish:
 *
 *   the mark spins — looping for as long as the car film is still buffering
 *     → decelerates and settles facing camera
 *     → to black
 *     → up on the car, already tight on the glass
 *     → pulls out, turns left → front, stops dead head-on
 *     → the login rises on a charcoal scrim
 *     → submit: the type turns to sand and blows off the car
 *     → the car finishes its turn onto the right side and leaves
 *     → the frame it leaves behind — skid marks on white — scatters too
 *     → the site was underneath all along
 */
export function Boot({ onFinish }: Props) {
  const seenIntro =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(INTRO_SEEN_KEY) === "1";

  const [phase, setPhase] = useState<Phase>(seenIntro ? "login" : "logo");
  const [carReady, setCarReady] = useState(false);
  const [black, setBlack] = useState(0);
  const [blackMs, setBlackMs] = useState(900);
  const [scrim, setScrim] = useState(seenIntro);

  const carRef = useRef<CarStageHandle>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  /** Bumped whenever the visitor skips, so in-flight steps stand down. */
  const run = useRef(0);

  async function jumpToLogin() {
    run.current += 1;
    carRef.current?.element()?.pause();
    setBlack(0);
    await carRef.current?.seek(CAR.headOn);
    setPhase("login");
    setScrim(true);
  }

  /* Act one — the mark settles, the curtain drops, the car arrives. */
  async function afterLogo() {
    const id = ++run.current;
    setBlackMs(900);
    setBlack(1);
    await wait(1180);
    if (run.current !== id) return;

    setPhase("approach");
    await carRef.current?.seek(0);
    if (run.current !== id) return;

    // The clip's own opening half-second is near black, so the curtain lifting
    // and the shot brightening end up being a single gesture.
    setBlackMs(1400);
    setBlack(0);
    await carRef.current?.playTo(CAR.headOn);
    if (run.current !== id) return;

    setPhase("login");
    setScrim(true);
  }

  /* Act two — the login lets go, the car leaves, the frame scatters. */
  async function afterLogin(role: Role) {
    const id = ++run.current;
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");

    setPhase("depart");
    setScrim(false);
    await wait(320);
    if (run.current !== id) return;

    await carRef.current?.playTo(CAR.duration - 0.06);
    if (run.current !== id) return;

    setPhase("scatter");
    await scatterFrame();
    if (run.current !== id) return;

    await wait(420);
    onFinish(role);
  }

  /** Turn the held final frame into drifting sand. */
  function scatterFrame() {
    const video = carRef.current?.element();
    const film = filmRef.current;
    if (!video || !film) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const cancel = runParticles({
        source: video,
        rect: () => new DOMRect(0, 0, window.innerWidth, window.innerHeight),
        mode: "dissolve",
        duration: 2.1,
        fit: "cover",
        spread: 340,
        gravity: -0.16,
        swirl: 92,
        drift: 0.9,
        stagger: 0.76,
        sweep: 0.7,
        // Sweeps left to right, carrying on the direction the car just left in.
        sweepAngle: 0,
        size: 1.2,
        fade: 0.88,
        onDone: resolve,
      });
      if (!cancel) return resolve();
      // The stage queued its rAF first, so by the time this callback runs the
      // opening (identical) particle frame is already drawn — no white flash
      // between the real video going and the sand arriving.
      requestAnimationFrame(() => {
        film.style.visibility = "hidden";
      });
    });
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-paper">
      <div ref={filmRef} className="absolute inset-0">
        <CarStage
          ref={carRef}
          mood={phase === "login" ? "hold" : "clear"}
          onReady={() => {
            setCarReady(true);
            if (seenIntro) void carRef.current?.seek(CAR.headOn);
          }}
        />

        {/* Charcoal wash, heaviest where the type sits. The studio behind the
            car is near-white; the form needs its own ground to read against.
            It runs sideways on desktop, where the panel is in the left column,
            and upwards on phones, where the panel sits along the bottom. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 transition-opacity duration-[1500ms] ease-lux",
            scrim ? "opacity-100" : "opacity-0",
          )}
        >
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background:
                "linear-gradient(to top, rgba(26,26,26,0.96) 0%, rgba(26,26,26,0.92) 44%, rgba(26,26,26,0.48) 72%, rgba(26,26,26,0.16) 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              // Falls off hard just past the panel's right edge (~33vw) so the
              // form has solid ground while the car stays clearly readable —
              // it is what the visitor has been waiting five seconds for.
              background:
                "linear-gradient(101deg, rgba(26,26,26,0.96) 0%, rgba(26,26,26,0.93) 26%, rgba(26,26,26,0.58) 46%, rgba(26,26,26,0.26) 72%, rgba(26,26,26,0.12) 100%)",
            }}
          />
        </div>

        {phase === "login" && <LoginPanel onAuthenticated={afterLogin} />}
      </div>

      {phase === "logo" && (
        <div className="absolute inset-0 z-10">
          <LogoLoader ready={carReady} onSettled={afterLogo} />
        </div>
      )}

      {/* The curtain between the two films. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-ink"
        style={{
          opacity: black,
          transition: `opacity ${blackMs}ms var(--ease-lux)`,
        }}
      />

      {(phase === "logo" || phase === "approach") && (
        <button
          onClick={jumpToLogin}
          className="absolute bottom-8 right-8 z-30 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-ash transition-colors duration-500 ease-lux hover:text-gold md:bottom-12 md:right-16"
        >
          Skip
        </button>
      )}
    </div>
  );
}
