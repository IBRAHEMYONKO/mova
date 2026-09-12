-- Run after community-upgrade.sql.
-- Prevent banned accounts from creating community content or reactions/reports.

DROP POLICY IF EXISTS "users create comments" ON public.comments;
CREATE POLICY "users create comments" ON public.comments
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_banned = false
    )
);

DROP POLICY IF EXISTS "users update own comments" ON public.comments;
CREATE POLICY "users update own comments" ON public.comments
FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_banned = false
    )
) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users create own reactions" ON public.comment_reactions;
CREATE POLICY "users create own reactions" ON public.comment_reactions
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_banned = false
    )
);

DROP POLICY IF EXISTS "users update own reactions" ON public.comment_reactions;
CREATE POLICY "users update own reactions" ON public.comment_reactions
FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_banned = false
    )
) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users create reports" ON public.reports;
CREATE POLICY "users create reports" ON public.reports
FOR INSERT WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_banned = false
    )
);
