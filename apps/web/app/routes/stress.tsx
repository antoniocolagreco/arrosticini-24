import { CircleAlert, Cpu, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "../components/breadcrumb.js";
import { SheepTile } from "../components/sheep-tile.js";
import { StressStatus, type StressTask, sheepState, updateStressTasks } from "../lib/stress.js";

export default function Stress() {
  const { t } = useTranslation("stress");
  const [tasks, setTasks] = useState<StressTask[]>([]);
  const [now, setNow] = useState<number>(0);
  const [connection, setConnection] = useState<"connecting" | "live" | "unavailable">("connecting");
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);

  useEffect(() => {
    let active: boolean = true;
    let controller: AbortController | undefined;
    let pending: boolean = false;
    async function poll(): Promise<void> {
      if (!active || document.hidden || pending) return;
      pending = true;
      controller = new AbortController();
      try {
        const response: Response = await fetch("/stress/status", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]),
        });
        if (!response.ok) throw new Error("Stress status unavailable");
        const status: StressStatus = StressStatus.parse(await response.json());
        if (!active || document.hidden) return;
        const receivedAt: number = performance.now();
        setTasks((previous) =>
          updateStressTasks(
            previous,
            status.api ? [status.web, status.api] : [status.web],
            receivedAt,
          ),
        );
        setNow(receivedAt);
        setConnection("live");
        setApiAvailable(status.api !== null);
      } catch {
        if (active && !document.hidden) setConnection("unavailable");
      } finally {
        pending = false;
      }
    }
    function tick(): void {
      if (document.hidden) return;
      const current: number = performance.now();
      setNow(current);
      setTasks((previous) => updateStressTasks(previous, [], current));
      void poll();
    }
    function visibility(): void {
      if (document.hidden) controller?.abort();
      else tick();
    }
    tick();
    const timer: ReturnType<typeof setInterval> = setInterval(tick, 500);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const announcement: string = tasks
    .map(
      (task) =>
        `${task.service} ${task.taskId.split("/").at(-1)?.slice(0, 8)}: ${t(sheepState(task, now))}`,
    )
    .join(". ");
  return (
    <>
      <Breadcrumb items={[{ label: t("title") }]} />
      <section className="stress-page shell">
        <header className="stress-heading">
          <div className="catalog-heading">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1>
              <span>{t("titleFirst")}</span> <span>{t("titleSecond")}</span>
            </h1>
            <p className="lead">{t("intro")}</p>
          </div>
          <p className="stress-connection" data-connection={connection} role="status">
            <span aria-hidden="true" />
            {t(connection)}
          </p>
        </header>
        <ul className="stress-legend" aria-label={t("legend")}>
          <li>
            <span className="stress-dot" data-state="calm" />
            {t("calmLegend")}
          </li>
          <li>
            <span className="stress-dot" data-state="overdrive" />
            {t("overdriveLegend")}
          </li>
          <li>
            <span className="stress-dot" data-state="ghost" />
            {t("ghostLegend")}
          </li>
        </ul>
        {(connection === "unavailable" || !apiAvailable) && (
          <p className="stress-warning">
            <CircleAlert size={20} aria-hidden="true" />
            {t(connection === "unavailable" ? "connectionError" : "apiError")}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
        <div className="stress-flock">
          {(["web", "api"] as const).map((service) => {
            const members: StressTask[] = tasks.filter((task) => task.service === service);
            return (
              <section className="stress-row" key={service} aria-labelledby={`stress-${service}`}>
                <div className="stress-service">
                  <h2 id={`stress-${service}`}>
                    <Server size={20} aria-hidden="true" />
                    {service === "web" ? "Web" : "API"}
                  </h2>
                  <p>
                    {t("taskCount", {
                      count: members.filter((task) => sheepState(task, now) !== "ghost").length,
                    })}
                  </p>
                </div>
                {members.length > 0 ? (
                  <ul className="stress-tiles">
                    {members.map((task) => (
                      <SheepTile key={task.taskId} task={task} now={now} />
                    ))}
                  </ul>
                ) : (
                  <p className="stress-empty" aria-busy={connection === "connecting"}>
                    {t(connection === "connecting" ? "waiting" : "noTasks")}
                  </p>
                )}
              </section>
            );
          })}
        </div>
        <aside className="stress-note">
          <Cpu size={20} aria-hidden="true" />
          <div>
            <h2>{t("noteTitle")}</h2>
            <p>{t("note")}</p>
            <p>{t("sampling")}</p>
          </div>
        </aside>
      </section>
    </>
  );
}
