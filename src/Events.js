import React, { useEffect, useState } from "react";
import { Feed, Grid, Button } from "semantic-ui-react";

import { useSubstrateState } from "./substrate-lib";

// Events to be filtered out from the event feed
const FILTERED_EVENTS = [
  'system:ExtrinsicSuccess',
];

const eventName = (ev) => `${ev.section}:${ev.method}`;
const eventParams = (ev) => JSON.stringify(ev.data);

function Main(props) {
  const { api } = useSubstrateState();
  const [eventFeed, setEventFeed] = useState([[], new Set()]);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let unsub = null;

    const allEvents = async () => {
      console.log("subscribed");

      unsub = await api.query.system.events((events) => {

        console.log("events received, with len:", events.length);

        const feed = events
          .map((record) => {
            // extract the phase, event and the event types
            const evHuman = record.event.toHuman();
            const evName = eventName(evHuman);
            const evParams = eventParams(evHuman);

            console.log("evHuman", evHuman);

            return { evName, evParams };
          })
          .filter(({ evName }) => !FILTERED_EVENTS.includes(evName))
          .map(({evName, evParams}, idx) => ({
            key: `${eventFeed[0].length + idx}-${evName}`,
            icon: "bell",
            summary: evName,
            content: evParams,
          }));

        if (feed.length === 0) return;

        setEventFeed(([prevFeed, prevSet]) => {
          // Because React fires useEffect() twice in strict mode, we need to ensure the events
          // haven't been added to the event feed before.
          console.log("prevFeed", prevFeed);
          console.log("prevSet", prevSet);

          const newFeed = feed.filter((oneFeed) => !prevSet.has(oneFeed.key));

          if (newFeed.length === 0) return ([prevFeed, prevSet]);

          // const newSet = new Set(Array.from(prevSet));
          const newSet = new Set(prevSet);
          newFeed.forEach((oneFeed) => newSet.add(oneFeed.key));

          console.log("addedFeed", newFeed);
          console.log("newSet", newSet);

          return([[...newFeed, ...prevFeed], newSet]);
        });
      });
      setSubscribed(true);
    };

    !subscribed && allEvents();
    return (() => {
      unsub && unsub();
      console.log("UNsubscribed");
      setSubscribed(false);
    })
  }, [api.query.system]);

  const { feedMaxHeight = 250 } = props;

  return (
    <Grid.Column width={8}>
      <h1 style={{ float: "left" }}>Events</h1>
      <Button
        basic
        circular
        size="mini"
        color="grey"
        floated="right"
        icon="erase"
        onClick={(_) => setEventFeed([[], new Set()])}
      />
      <Feed
        style={{ clear: "both", overflow: "auto", maxHeight: feedMaxHeight }}
        events={eventFeed[0]}
      />
    </Grid.Column>
  );
}

export default function Events(props) {
  const { api } = useSubstrateState();
  return api.query && api.query.system && api.query.system.events ? (
    <Main {...props} />
  ) : null;
}
