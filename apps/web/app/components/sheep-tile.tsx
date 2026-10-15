import { Cpu } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type SheepState, type StressTask, sheepState } from "../lib/stress.js";

export function SheepTile({ task, now }: { task: StressTask; now: number }) {
  const { t, i18n } = useTranslation("stress");
  const preference: boolean | null = useReducedMotion();
  const [reduced, setReduced] = useState<boolean>(preference ?? false);
  useEffect(() => {
    const media: MediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const state: SheepState = sheepState(task, now);
  const shortId: string = task.taskId.split("/").at(-1)?.slice(0, 8) ?? task.taskId;
  const percent: string = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 1,
  }).format(task.cpuPercent);
  return (
    <li
      className="sheep-tile"
      data-state={state}
      data-task-id={task.taskId}
      aria-label={t(state === "ghost" ? "taskGhost" : "taskLabel", {
        id: shortId,
        state: t(state),
        percent,
      })}
    >
      <motion.div
        className="sheep-portrait"
        animate={
          state === "overdrive" && !reduced
            ? { x: [0, -1, 0, 1, 0], y: [0, 1, 0, -1, 0], rotate: [0, -2, 0, 2, 0] }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={{
          duration: reduced ? 0 : 0.24,
          repeat: state === "overdrive" && !reduced ? Infinity : 0,
        }}
      >
        <motion.img
          initial={false}
          src="/images/sheep_overdrive_off.webp"
          alt=""
          width="512"
          height="512"
          animate={{ opacity: state === "overdrive" ? 0 : state === "ghost" ? 0.35 : 1 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        />
        <motion.img
          initial={false}
          src="/images/sheep_overdrive_on.webp"
          alt=""
          width="512"
          height="512"
          animate={{ opacity: state === "overdrive" ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        />
      </motion.div>
      <span className="sheep-cpu">
        <Cpu size={16} aria-hidden="true" />
        {state === "ghost" ? "—" : `${percent}%`}
      </span>
      <span className="sheep-state">{t(state)}</span>
      <span className="sheep-bar" aria-hidden="true">
        <span style={{ width: `${state === "ghost" ? 0 : task.cpuPercent}%` }} />
      </span>
      <p className="sheep-meta">
        <span>
          {task.version} · {task.availabilityZone}
        </span>
        <span title={task.taskId}>{shortId}</span>
      </p>
    </li>
  );
}
