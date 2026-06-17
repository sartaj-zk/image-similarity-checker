import React from 'react'
import { ExternalLink, Database, Key, CheckCircle2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

function A({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-accent hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink className="w-3 h-3" />
    </a>
  )
}

function Code({ children }) {
  return (
    <span onClick={() => { navigator.clipboard.writeText(children); toast.success('Copied!') }}
      className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1 font-mono text-xs text-accent cursor-pointer hover:border-accent/40 transition-colors">
      {children} <Copy className="w-3 h-3 text-muted" />
    </span>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4 pb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <div className="text-sm text-muted space-y-2 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-accent">Supabase</span> Setup
          </h1>
          <p className="text-muted">
            This tool uses Supabase (free, no credit card) to store images and run comparisons.
            Takes about 5 minutes to set up.
          </p>
        </div>

        {/* Env vars needed */}
        <div className="card p-5 mb-8">
          <p className="text-xs text-muted uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
            <Key className="w-3.5 h-3.5" /> Variables to add in Netlify
          </p>
          <div className="space-y-3">
            {[
              { key: 'SUPABASE_URL',      desc: 'Your Supabase project URL' },
              { key: 'SUPABASE_ANON_KEY', desc: 'Your Supabase anon/public API key' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border">
                <Code>{key}</Code>
                <p className="text-xs text-muted mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Supabase Setup</h2>
              <p className="text-xs text-muted">Free forever · No credit card needed</p>
            </div>
          </div>

          <Step n="1" title="Create a Supabase account">
            Go to <A href="https://supabase.com">supabase.com</A> and click <strong className="text-white">Start your project</strong>.
            Sign up with GitHub (easiest) or email. It's completely free.
          </Step>

          <Step n="2" title="Create a new project">
            Click <strong className="text-white">New project</strong>.
            Give it any name like <em className="text-white">image-checker</em>.
            Choose any region close to you.
            Set a database password (save it somewhere safe).
            Click <strong className="text-white">Create new project</strong> and wait ~1 minute.
          </Step>

          <Step n="3" title="Create the images table">
            Once your project loads, click <strong className="text-white">SQL Editor</strong> in the left sidebar.
            Click <strong className="text-white">New query</strong> and paste this SQL, then click <strong className="text-white">Run</strong>:
            <div className="mt-2 bg-ink rounded-xl border border-border p-4 font-mono text-xs text-green-400 leading-relaxed">
              CREATE TABLE images (<br />
              &nbsp;&nbsp;id SERIAL PRIMARY KEY,<br />
              &nbsp;&nbsp;filename TEXT NOT NULL,<br />
              &nbsp;&nbsp;phash TEXT,<br />
              &nbsp;&nbsp;file_url TEXT,<br />
              &nbsp;&nbsp;uploaded_at TIMESTAMPTZ DEFAULT NOW()<br />
              );
            </div>
          </Step>

          <Step n="4" title="Create a Storage bucket">
            In the left sidebar click <strong className="text-white">Storage</strong>.
            Click <strong className="text-white">New bucket</strong>.
            Name it exactly: <Code>images</Code>
            Tick <strong className="text-white">Public bucket</strong> so images can be viewed.
            Click <strong className="text-white">Save</strong>.
          </Step>

          <Step n="5" title="Get your API keys">
            In the left sidebar click <strong className="text-white">Project Settings</strong> (gear icon at bottom).
            Then click <strong className="text-white">API</strong>.
            You'll see two things to copy:
            <ul className="mt-2 space-y-1 list-none">
              <li>• <strong className="text-white">Project URL</strong> → this is your <Code>SUPABASE_URL</Code></li>
              <li>• <strong className="text-white">anon public</strong> key → this is your <Code>SUPABASE_ANON_KEY</Code></li>
            </ul>
          </Step>

          <Step n="6" title="Add keys to Netlify">
            Go to your <A href="https://app.netlify.com">Netlify dashboard</A> →
            your site → <strong className="text-white">Project configuration</strong> →
            <strong className="text-white">Environment variables</strong> →
            <strong className="text-white">Add a variable</strong>.
            Add both <Code>SUPABASE_URL</Code> and <Code>SUPABASE_ANON_KEY</Code>.
            Then go to <strong className="text-white">Deploys</strong> and click
            <strong className="text-white">Trigger deploy → Deploy site</strong>.
          </Step>
        </div>

        {/* Checklist */}
        <div className="card p-5">
          <p className="text-xs text-muted uppercase tracking-wider font-medium mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Checklist
          </p>
          <div className="space-y-2">
            {[
              'Create Supabase account (free)',
              'Create new project',
              'Run the SQL to create the images table',
              'Create a public Storage bucket called "images"',
              'Copy Project URL → SUPABASE_URL in Netlify',
              'Copy anon key → SUPABASE_ANON_KEY in Netlify',
              'Redeploy the site',
              'Upload an image and test!',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-border" />
                <span className="text-sm text-muted">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
