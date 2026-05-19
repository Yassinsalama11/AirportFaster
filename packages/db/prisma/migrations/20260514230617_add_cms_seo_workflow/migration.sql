-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('airport', 'service', 'airport_service', 'guide', 'faq', 'policy');

-- CreateEnum
CREATE TYPE "CmsPublishStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "FaqScopeType" AS ENUM ('airport', 'service', 'airport_service', 'page', 'global');

-- CreateEnum
CREATE TYPE "SchemaBlockStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "SitemapLogStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "SitemapLogTrigger" AS ENUM ('publish', 'scheduled', 'manual');

-- CreateEnum
CREATE TYPE "ContentWorkflowEntityType" AS ENUM ('page_translation', 'airport_seo', 'service_seo', 'faq', 'translation_job');

-- CreateEnum
CREATE TYPE "ContentWorkflowState" AS ENUM ('draft', 'in_review', 'approved', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "ContentWorkflowSource" AS ENUM ('human', 'ai');

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "type" "PageType" NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CmsPublishStatus" NOT NULL DEFAULT 'draft',
    "airport_id" UUID,
    "service_id" UUID,
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "h1" TEXT,
    "direct_answer" TEXT,
    "body" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "ai_summary" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "scope_type" "FaqScopeType" NOT NULL,
    "scope_id" UUID,
    "locale" VARCHAR(10) NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CmsPublishStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_blocks" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "schema_type" TEXT NOT NULL,
    "schema_json" JSONB NOT NULL,
    "status" "SchemaBlockStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schema_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_links" (
    "id" UUID NOT NULL,
    "from_page_id" UUID NOT NULL,
    "to_page_id" UUID NOT NULL,
    "anchor_text" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitemap_logs" (
    "id" UUID NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url_count" INTEGER NOT NULL,
    "status" "SitemapLogStatus" NOT NULL,
    "trigger" "SitemapLogTrigger" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sitemap_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_approval_workflow" (
    "id" UUID NOT NULL,
    "entity_type" "ContentWorkflowEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "state" "ContentWorkflowState" NOT NULL DEFAULT 'draft',
    "source" "ContentWorkflowSource" NOT NULL DEFAULT 'human',
    "submitted_by" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "notes" TEXT,
    "page_translation_id" UUID,
    "airport_seo_id" UUID,
    "service_seo_id" UUID,
    "faq_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "content_approval_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_type_idx" ON "pages"("type");

-- CreateIndex
CREATE INDEX "pages_status_idx" ON "pages"("status");

-- CreateIndex
CREATE INDEX "pages_airport_id_idx" ON "pages"("airport_id");

-- CreateIndex
CREATE INDEX "pages_service_id_idx" ON "pages"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_page_id_locale_key" ON "page_translations"("page_id", "locale");

-- CreateIndex
CREATE INDEX "faqs_scope_type_scope_id_idx" ON "faqs"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "faqs_locale_idx" ON "faqs"("locale");

-- CreateIndex
CREATE INDEX "faqs_status_idx" ON "faqs"("status");

-- CreateIndex
CREATE INDEX "schema_blocks_page_id_locale_idx" ON "schema_blocks"("page_id", "locale");

-- CreateIndex
CREATE INDEX "schema_blocks_schema_type_idx" ON "schema_blocks"("schema_type");

-- CreateIndex
CREATE INDEX "schema_blocks_status_idx" ON "schema_blocks"("status");

-- CreateIndex
CREATE INDEX "internal_links_to_page_id_idx" ON "internal_links"("to_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_links_from_page_id_to_page_id_locale_anchor_text_key" ON "internal_links"("from_page_id", "to_page_id", "locale", "anchor_text");

-- CreateIndex
CREATE INDEX "sitemap_logs_generated_at_idx" ON "sitemap_logs"("generated_at");

-- CreateIndex
CREATE INDEX "sitemap_logs_status_idx" ON "sitemap_logs"("status");

-- CreateIndex
CREATE INDEX "content_approval_workflow_entity_type_entity_id_idx" ON "content_approval_workflow"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "content_approval_workflow_state_idx" ON "content_approval_workflow"("state");

-- CreateIndex
CREATE INDEX "content_approval_workflow_source_idx" ON "content_approval_workflow"("source");

-- CreateIndex
CREATE INDEX "content_approval_workflow_submitted_by_idx" ON "content_approval_workflow"("submitted_by");

-- CreateIndex
CREATE INDEX "content_approval_workflow_reviewed_by_idx" ON "content_approval_workflow"("reviewed_by");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schema_blocks" ADD CONSTRAINT "schema_blocks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_from_page_id_fkey" FOREIGN KEY ("from_page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_links" ADD CONSTRAINT "internal_links_to_page_id_fkey" FOREIGN KEY ("to_page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_page_translation_id_fkey" FOREIGN KEY ("page_translation_id") REFERENCES "page_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_airport_seo_id_fkey" FOREIGN KEY ("airport_seo_id") REFERENCES "airport_seo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_service_seo_id_fkey" FOREIGN KEY ("service_seo_id") REFERENCES "service_seo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_approval_workflow" ADD CONSTRAINT "content_approval_workflow_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "faqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
