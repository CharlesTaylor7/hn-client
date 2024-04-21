import React, { useState, useRef, useEffect } from 'react';
import * as HN from '../HackerNewsAPI';
import Item from './Item';
import { SortedMap } from 'immutable-sorted';
import ReactLogo from './ReactLogo';


export const App = () => {
  const previousId = useRef(null);
  const [items, setItems] = useState(SortedMap([], (a, b) => b - a));

  useEffect(() => {
    const source = new EventSource('https://hacker-news.firebaseio.com/v0/maxitem.json');

    source.addEventListener("put", (event) => {
      const json = JSON.parse(event.data);
      let end = json.data;
      let start = previousId.current || (end - 100);
      previousId.current = end;

      if (start !== null) {
        for (let i = end; i > start; i--) {
          HN.getRoot(i).then(item => {
            if (!item || item.deleted) return;
            setItems(elements => elements.set(item.id, item));
          });
        }
      }
    });
  }, []);

  return (
    <div>
      <header className='p-0 flex flex-col gap-2'>
        {items.toArray().map(([_, item]) => <Item key={item.id} item={item} />)}
      </header>
    </div>
  );
};
