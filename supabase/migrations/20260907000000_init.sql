-- Full schema for the web component library, as a single starting-point
-- migration. Earlier exploratory migrations were collapsed into this one.
--
-- Drops first so this file is the whole truth and can be re-run on a scratch
-- project. Ordered children-before-parents; cascade covers the rest.
drop table if exists public.components cascade;
drop table if exists public.variables cascade;
drop table if exists public.settings cascade;
drop table if exists public.pages cascade;

-- ---------------------------------------------------------------------------
-- pages
-- ---------------------------------------------------------------------------
-- A page groups components. parent_id lets a page hang under another one so
-- the library can be organised into sections instead of one flat list.
--
-- These pages are the site's main navigation. Developers can also hand-write
-- their own Astro pages that pull in components by reference; see the
-- components.ref column below.
create table public.pages (
	id uuid primary key default gen_random_uuid(),
	parent_id uuid references public.pages (id) on delete cascade,
	title text not null,
	-- The human-chosen public URL.
	slug text not null unique,
	-- A second, unguessable slug used for the admin route, so the management
	-- URL is not derivable from the public one.
	admin_slug text not null unique default replace(gen_random_uuid()::text, '-', ''),
	description text,
	created_at timestamptz not null default now(),
	-- Blocks the one cycle a constraint can actually see. Deeper cycles
	-- (A -> B -> A) are prevented in the UI, which only offers top-level pages
	-- as a parent; enforcing that in SQL would need a trigger and buys little.
	constraint pages_no_self_parent check (parent_id is null or parent_id <> id)
);

create index pages_parent_id_idx on public.pages (parent_id);

-- ---------------------------------------------------------------------------
-- components
-- ---------------------------------------------------------------------------
-- The markup column is asp_code, not html_code: these components ship into a
-- Classic ASP platform and the source genuinely contains <% %> blocks.
create table public.components (
	id uuid primary key default gen_random_uuid(),

	-- A short sequential number, separate from the uuid primary key, so a
	-- developer can hand-write <CodeComponent id="7" /> in their own Astro
	-- page. A uuid would be unusable for that.
	ref bigint generated always as identity unique,

	page_id uuid not null references public.pages (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,

	-- Denormalised so the editor can show who wrote a component without
	-- exposing auth.users to the client, and so the credit survives the
	-- author's account being deleted.
	created_by_email text,

	title text not null,
	asp_code text,
	less_code text,
	js_code text,

	-- LESS mixins this component needs, compiled ahead of less_code. Define
	-- them with parentheses -- .thing() { ... } -- so they emit no CSS of
	-- their own; a plain .thing { ... } ruleset is output as a real rule.
	mixins_code text,

	-- This component's own ASP variable overrides as a name -> value map. A
	-- jsonb column rather than a child table because it is always read and
	-- written together with the component, never queried on its own, and the
	-- editor edits it as a single block. Global variables live in their own
	-- table because they are a shared registry with their own screen.
	variables jsonb not null default '{}'::jsonb,

	created_at timestamptz not null default now(),
	-- Maintained explicitly by the update action rather than by a trigger, so
	-- the one place that writes components is the one place that stamps it.
	updated_at timestamptz not null default now(),

	-- Guards against an array or scalar being written where the resolver
	-- expects an object to read name -> value pairs from.
	constraint components_variables_is_object check (jsonb_typeof(variables) = 'object')
);

create index components_page_id_idx on public.components (page_id);
create index components_user_id_idx on public.components (user_id);

-- ---------------------------------------------------------------------------
-- variables (global)
-- ---------------------------------------------------------------------------
-- Stands in for the ASP runtime's variables (TXT_IMG_PATH, TXT_SEO_LOCATION,
-- ...) so a component can be previewed outside the real platform. A component's
-- own `variables` map overrides an entry here of the same name.
create table public.variables (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	value text not null default '',
	created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings (singleton)
-- ---------------------------------------------------------------------------
-- What the preview environment loads. The preview deliberately injects no site
-- baseline CSS: a component is shown with its own compiled styles only.
--
--   preview_css_urls        external stylesheets the components need, i.e. icon
--                           fonts (Font Awesome, iconmonstr). <link> tags.
--   preview_js_urls         scripts loaded before the component's JS (jQuery).
--   preview_less_variables  LESS declarations for the values that differ per
--                           site (@black, @index-primary, @img-path). Platform
--                           mixins and variables are NOT here: those are read
--                           from the real files in src/v6v7/_platform-less-ref
--                           at compile time, so they cannot drift.
create table public.settings (
	id boolean primary key default true check (id),
	preview_css_urls text[] not null default '{}',
	preview_js_urls text[] not null default
		array['//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js'],
	preview_less_variables text not null default '',
	updated_at timestamptz not null default now()
);

insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Shared library model: everything is publicly readable (the components render
-- on public documentation pages) and any authenticated user is an admin who
-- can manage any row.
alter table public.pages enable row level security;
alter table public.components enable row level security;
alter table public.variables enable row level security;
alter table public.settings enable row level security;

create policy "pages_public_select" on public.pages for select to anon, authenticated using (true);
create policy "pages_admin_insert" on public.pages for insert to authenticated with check (true);
create policy "pages_admin_update" on public.pages for update to authenticated using (true) with check (true);
create policy "pages_admin_delete" on public.pages for delete to authenticated using (true);

create policy "components_public_select" on public.components for select to anon, authenticated using (true);
-- On creation the row must be attributed to whoever is actually creating it.
create policy "components_admin_insert" on public.components for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "components_admin_update" on public.components for update to authenticated using (true) with check (true);
create policy "components_admin_delete" on public.components for delete to authenticated using (true);

create policy "variables_public_select" on public.variables for select to anon, authenticated using (true);
create policy "variables_admin_insert" on public.variables for insert to authenticated with check (true);
create policy "variables_admin_update" on public.variables for update to authenticated using (true) with check (true);
create policy "variables_admin_delete" on public.variables for delete to authenticated using (true);

create policy "settings_public_select" on public.settings for select to anon, authenticated using (true);
create policy "settings_admin_update" on public.settings for update to authenticated using (true) with check (true);

-- Reachable through the Data API regardless of project defaults.
grant select on public.pages to anon, authenticated;
grant insert, update, delete on public.pages to authenticated;

grant select on public.components to anon, authenticated;
grant insert, update, delete on public.components to authenticated;

grant select on public.variables to anon, authenticated;
grant insert, update, delete on public.variables to authenticated;

grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
