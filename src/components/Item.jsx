import React, { useState, useEffect, useRef } from "react";
import * as HN from "../HackerNewsAPI";
import PollOption from "./PollOption";
import { SortedMap } from "immutable-sorted";
import { getDatabase } from "../storage";

export default function Item({ item }) {
  const ref = useRef();
  const [orphaned, setOrphaned] = useState(false);
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState(SortedMap([], (a, b) => b - a));
  const [pollOpts, setPollOpts] = useState([]);

  useEffect(() => {
    // if item has poll options, get all the poll options simultaneously.
    if (item && item.parts) {
      Promise.all(item.parts.map(HN.getItem)).then((allParts) => {
        const totalPollScore = allParts.reduce(
          (total, next) => total + next.score,
          0,
        );
        setPollOpts(
          allParts.map((pollOpt) => (
            <PollOption
              key={pollOpt.id}
              item={pollOpt}
              totalPollScore={totalPollScore}
            />
          )),
        );
      });
    }

    // if item has children, load them in one at a time.
    if (item && item.kids) {
      for (const childId of item.kids) {
        HN.getItem(childId).then((item) => {
          if (!item) return;
          setChildren((children) => children.set(item.id, item));
        });
      }
    }
  }, []);

  if (orphaned) return null;
  return (
    <div ref={ref} id={item.id} data-item={JSON.stringify(item)}>
      <span className="flex flex-row gap-2">
        <a href={`#${item.parent}`}>Parent</a>
        &middot;
        <a href={`#${ref.current?.previousSibling?.id}`}>Prev</a>
        &middot;
        <a href={`#${ref.current?.nextSibling?.id}`}>Next</a>
        &middot;
        <a href={`https://news.ycombinator.com/item?id=${item.id}`}>Original</a>
      </span>
      <div className="flex">
        {item.parent ? null : item.watch ? (
          <button
            className="btn btn-sm px-2 btn-error"
            onClick={() => {
              item.watch = 0;
              setOrphaned(true);
              document.dispatchEvent(
                new CustomEvent("unbookmark", { detail: item }),
              );
              getDatabase().then((db) =>
                db
                  .transaction(["items"], "readwrite")
                  .objectStore("items")
                  .put(item),
              );
            }}
          >
            <span className="material-symbols-outlined">bookmark_remove</span>
          </button>
        ) : (
          <button
            className="btn btn-sm px-2 btn-success"
            onClick={() => {
              item.watch = 1;
              setOrphaned(true);
              document.dispatchEvent(
                new CustomEvent("bookmark", { detail: item }),
              );
              getDatabase().then((db) =>
                db
                  .transaction(["items"], "readwrite")
                  .objectStore("items")
                  .put(item),
              );
            }}
          >
            <span className="material-symbols-outlined">bookmark_add</span>
          </button>
        )}
        <ExpandButton open={open} setOpen={setOpen} />
        {item.url ? (
          <a
            className="underline decoration-sky-300 visited:decoration-violet-400"
            href={item.url}
            target="_blank"
            rel="no-referrer"
          >
            {item.title}
          </a>
        ) : open ? (
          <span className="whitespace-pre-wrap">
            {item.title ? item.title + "\n" : null}
            {item.text}
          </span>
        ) : (
          <span className="truncate">{item.title || item.text}</span>
        )}
      </div>
      {open ? (
        <div className="ml-2 flex flex-col gap-1">
          {pollOpts}
          {children.toArray().map(([_, child]) => (
            <Item key={child.id} item={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const ExpandButton = ({ open, setOpen }) => (
  <button
    className="btn btn-primary rounded-full h-8 w-8 mx-2 min-h-revert"
    onClick={() => setOpen((status) => !status)}
  >
    {open ? "-" : "+"}
  </button>
);
