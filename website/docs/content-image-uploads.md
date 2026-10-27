> **Content Studio V2:** For the current direct-publishing workflow and shared media architecture, see [content-studio-v2.md](content-studio-v2.md). Approval instructions below describe the retained historical implementation.

# Direct content image uploads

Announcements and Events now expose file selection and drag-and-drop inside their existing featured-image field. Staff supply alt text and either an explicit own-work permission declaration or creator credit and licensing/permission evidence. Source links, alternate credit and unresolved conditions are compact secondary details. The Library title defaults to the filename; own-work credit defaults to the authenticated display name. No creator permission or editorial authorization is inferred merely from upload.

## Normal staff flow

1. Choose/drop an image. A local preview appears; provide alt text and creator rights.
2. Upload image. The existing private upload validator, WASM decoder, D1 metadata/audit and R2 storage handle it. The response immediately previews the private, decoded image.
3. Save the content. Moderators can submit the saved revision for review with its pending image and frozen evidence attached.

Replace uploads leave the previous attachment in place until the new upload succeeds. Remove clears the working attachment only. Choose from Library remains available for already-eligible reusable images. Successful image changes mark the editor unsaved. Save/publication actions are blocked during an active upload/preparation; creator/input errors retain the file and content. Cancelling a file selection or failed upload does not remove the old image. Local object URLs are revoked when the file changes or the component unmounts. Multipart requests use the existing same-origin CSRF header and bounded body decoder; no forms are nested inside editor forms.

## Image review without a Library trip

Administrators/Owners see the pending image and immutable creator evidence alongside the content in the editor and saved-revision review. In the editor, they explicitly check that they reviewed the evidence and choose **Approve image & use it**. This records the existing editorial grant and prepares the existing immutable public-ready derivatives. A Moderator cannot perform this action, including by directly posting to its endpoint. Unresolved conditions and stale asset metadata block authorization.

The resulting presentation changes the working editor only. Staff must Save the new revision, then use the existing 05C approval/publishing toolbar. Image consent never approves or publishes the content. This deliberate save ensures approval remains attached to the exact revision with the approved image/alt/attribution. Combining image authorization, content saving and publication into a single confirmation is not implemented; it would need additional guarded orchestration and failure recovery, rather than silently granting consent when Publish is clicked.

## Why migration 0010 is necessary

05D deliberately permits only already-authorized image presentations in saved revisions. A UI-only upload change would therefore prevent a Moderator from attaching and submitting a new image. `0010_pending_content_images.sql` adds immutable upload submissions/evidence and revision-bound pending attachments. It extends the existing active-reference view for trash protection and adds database guards that block approving, releasing or activating a pending-image revision. Pending drafts may be saved/submitted; approvals, Publish Now, scheduling and Cron cannot bypass the guard. Existing 05D bindings, immutable approvals/history and public delivery remain unchanged.

Library metadata changes do not silently alter pending evidence: the submission captures the asset version and presentation. A changed asset must be replaced/reviewed again. Current working references, including pending images, prevent trash; historical submissions remain immutable without making the whole Library public. Replacing a private revision keeps its previous live image unchanged.

Uploads and derivative preparation cannot share a transaction with D1. An abandoned, cancelled or ambiguously failed request can leave a private Library asset or private derivative orphan. Nothing is published and no accepted asset is automatically deleted. Staff can reuse an unreferenced upload from the Library or move it to recoverable trash; a purge/reconciliation job remains a separate retention decision. A lost upload response should be checked in the Library before retrying. Failed submission/audit writes may leave the already-accepted private upload available there.

Migration 0010 is reviewed/tested against isolated local data only; it has not been applied to persistent local D1. Before interactive acceptance, run `npm.cmd run db:migrate:local` from `website/` to apply pending local migrations. No dependencies, production bindings, remote migrations, deployments or teaser changes are included.

## Homepage Showcase: focused proposal, not implemented

Inspection found `Homepage Manager` listed without an `href` in `app/lib/dashboard-tools.ts`; it is unavailable. `Showcase` in `app/components/community.tsx` rotates a hard-coded array of three labelled illustrated placeholders. There is no existing slide-management route, persistence, ordering or publishing service to extend.

Recommended scope for a separate implementation:

- One Administrator/Owner-only `/control/homepage` tool dedicated to the rotating showcase.
- Add Slide opens the same direct-upload/Library selection interaction, with required alt/credit/rights and optional title, description and safe link.
- Show slide previews in an ordered list; provide Move up/Move down buttons as accessible alternatives to dragging, Replace Image and Remove Slide.
- Maintain a private working collection and immutable live release. Save draft and an explicit Publish showcase action use CSRF, optimistic versions, confirmations and immutable audits. Avoid introducing arbitrary homepage blocks, rich-page editing or a general CMS.
- Public `Showcase` receives only the approved live list while preserving existing carousel pause/focus/reduced-motion behavior and the Apricot Glow/Leaf Sage treatment. Development illustrations stay honestly labelled.
- Reuse private originals/derivatives and exact live-binding delivery checks, adding a showcase release/reference model instead of forcing slides into the announcement/event-only content schema.
- Treat independent showcase artwork as a homepage use requiring verified creator permission and explicit Administrator/Owner authorization. Announcement/event editorial consent covers associated homepage teasers; it must not silently authorize unrelated standalone hero artwork.

Decisions before that implementation: maximum slides (recommend 8), whether links are same-site-only (recommend initially yes), and whether to preserve labelled illustrated placeholders when no live slides exist (recommend yes until an intentional first release). Showcase publication stays Administrator/Owner-only server-side. The manager and its migration/delivery scope require a separate focused implementation; this task does not enable the unavailable navigation item.

## Validation and manual acceptance

Automated checks cover pending-image save/submission, immutable evidence, creator/rights defaults, blocked Moderator authorization, missing evidence/conditions, stale grants and asset metadata, live-image isolation, pending trash protection, server-side publication guards, direct multipart CSRF and authorization in built workerd, plus existing editor/media/workflow regressions.

Implementation validation passed: **97 tests**, typecheck, build, built-route checks, both local workerd suites and `git diff --check`. Isolated headless browser fixtures passed Announcement/Event uploads at 1440/390/320px: drag/drop, local preview, rights capture, private upload, inline authorization, pending/approved attachment switching, failed replacement preservation, removal, no nested forms and Library focus restoration. Screenshots were inspected. The fixtures use illustrative content and mocked upload responses; real authenticated staff sessions and screen-reader acceptance remain manual checks.

Manual checklist using labelled local test content:

1. In both editors, click to choose and drag/drop a JPEG/PNG/WebP. Check immediate local and uploaded previews, own-work declaration, licensed-image evidence, default credit and optional source.
2. Upload, Save and Submit as Moderator. Reopen the draft and saved review; verify image/evidence are retained and image authorization/publication is unavailable to that role.
3. As Administrator/Owner, review evidence in the editor, explicitly authorize, Save the new revision and publish/schedule through the existing toolbar. Test unresolved conditions and stale-image failures.
4. Replace/remove an image privately and verify the existing public image stays unchanged until an authorized replacement release. Confirm failed/cancelled uploads retain the old attachment and content.
5. Check Choose from Library, slow uploads, cancellation/lost-response guidance, corrupt/oversize files, alt-text validation, two-tab conflicts and pending/live trash protection.
6. At desktop/390/320px, use keyboard file selection and Library navigation, inspect focus after upload, screen-reader announcements, contrast and mobile scrolling. Recheck both Event attachment types can replace each other without losing timing.
7. Confirm the Homepage Manager remains unavailable and the public illustrative showcase is unchanged. No real community images should become public without an authorized release.
