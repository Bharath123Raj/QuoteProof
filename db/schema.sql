CREATE TABLE search_usage (
  id TEXT PRIMARY KEY NOT NULL,
  month TEXT NOT NULL,
  day TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX search_usage_month ON search_usage(month);
--> statement-breakpoint
CREATE INDEX search_usage_user_day ON search_usage(user_id,day);
--> statement-breakpoint
CREATE INDEX search_usage_user_time ON search_usage(user_id,created_at);
