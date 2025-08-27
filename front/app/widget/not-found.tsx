import { useEffect } from "react";
import { TbMoodSad, TbX } from "react-icons/tb";
import cn from "@meltdownjs/cn";

export default function NotFound() {
  useEffect(() => {
    document.documentElement.style.background = "transparent";
  }, []);

  function handleClose() {
    window.parent.postMessage("close", "*");
  }

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-base-100">
      <div
        className={cn(
          "flex flex-col gap-4 p-6 justify-center",
          "items-center rounded-box bg-base-200/50",
          "border border-base-300 shadow",
          "w-fit h-fit"
        )}
      >
        <div className="text-8xl text-base-content/70">
          <TbMoodSad />
        </div>
        <div className="text-base-content/50">Chat not found. Contact the owner.</div>
        <button className="btn btn-primary" onClick={handleClose}>
          Close <TbX />
        </button>
      </div>
    </div>
  );
}
