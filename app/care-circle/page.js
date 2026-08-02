"use client";

import { useState, useEffect } from "react";
import {
  Plus, X, Pencil, Trash2, Copy, Check, Heart, Users, Stethoscope, Car,
  ShieldAlert, ClipboardList, Calendar, Pill, StickyNote, FileText, MessageSquareHeart,
} from "lucide-react";
import { supabase, getOrCreateSessionId } from "../../lib/supabase";
import { sendCareUpdateEmails } from "../actions/sendCareUpdateEmail";

const TEMPLATES = [
  { label: "😊 Feeling Better", text: "Feeling better today, thank you for the support." },
  { label: "💙 Need Prayers", text: "Could use some extra prayers and good thoughts today." },
  { label: "🏥 Treatment Today", text: "Heading in for treatment today." },
  { label: "📅 New Appointment", text: "Just scheduled a new appointment." },
  { label: "📄 Scan Results", text: "Got my scan results back." },
  { label: "🙏 Thank You Everyone", text: "Thank you all so much for everything." },
  { label: "🎉 Good News", text: "Have some good news to share!" },
];

const ASK_TEMPLATES = [
  "Drive me to an appointment",
  "Pick up a prescription",
  "Bring a meal",
  "Sit with me during treatment",
  "Help with children or pets",
  "Make phone calls",
  "Take appointment notes",
  "Check in with me",
];

const RELATIONSHIP_GROUPS = [
  { key: "Primary caregiver", icon: Heart },
  { key: "Family", icon: Users },
  { key: "Friends", icon: Users },
  { key: "Healthcare contacts", icon: Stethoscope },
  { key: "Transportation helpers", icon: Car },
  { key: "Emergency contacts", icon: ShieldAlert },
];

function randomToken() {
  // Uses the browser's real cryptographic random generator (not Math.random(),
  // which isn't designed to resist prediction) — this is the only credential
  // gating access to a patient's Care Circle data, so it needs to be
  // genuinely unguessable, not just "long enough by accident."
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CareCirclePage() {
  const [view, setView] = useState("home");

  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [wallMessages, setWallMessages] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [activeMeds, setActiveMeds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIP_GROUPS[0].key);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [perms, setPerms] = useState({
    view_updates: true,
    view_appointments: false,
    add_appointments: false,
    view_documents: false,
    upload_documents: false,
    view_medications: false,
    confirm_medication_pickup: false,
    create_tasks: true,
    view_private_health_details: false,
    view_trials: false,
    emergency_access: false,
  });
  const [copiedId, setCopiedId] = useState(null);

  const [showAskForm, setShowAskForm] = useState(false);
  const [askText, setAskText] = useState("");

  const [updateText, setUpdateText] = useState("");
  const [updateCategory, setUpdateCategory] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const sessionId = await getOrCreateSessionId();
    const today = new Date().toISOString().slice(0, 10);

    const [mRes, tRes, uRes, wRes, apptRes, medRes] = await Promise.all([
      supabase.from("care_circle_members").select("*").eq("session_id", sessionId).order("id"),
      supabase.from("care_tasks").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
      supabase.from("care_updates").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
      supabase.from("support_wall_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select("*")
        .eq("session_id", sessionId)
        .gte("appt_date", today)
        .order("appt_date", { ascending: true })
        .limit(1),
      supabase.from("medications").select("*").eq("session_id", sessionId).eq("status", "Active"),
    ]);

    setMembers(mRes.data || []);
    setTasks(tRes.data || []);
    setUpdates(uRes.data || []);
    setWallMessages(wRes.data || []);
    setNextAppointment(apptRes.data && apptRes.data.length > 0 ? apptRes.data[0] : null);
    setActiveMeds(medRes.data || []);
    setLoading(false);
  }

  // --- Members ---
  function openNewMember() {
    setEditingId(null);
    setName("");
    setRelationship(RELATIONSHIP_GROUPS[0].key);
    setEmail("");
    setPhone("");
    setExpiresAt("");
    setPerms({
      view_updates: true,
      view_appointments: false,
      add_appointments: false,
      view_documents: false,
      upload_documents: false,
      view_medications: false,
      confirm_medication_pickup: false,
      create_tasks: true,
      view_private_health_details: false,
      view_trials: false,
      emergency_access: false,
    });
    setShowMemberForm(true);
  }

  function openEditMember(m) {
    setEditingId(m.id);
    setName(m.name);
    setRelationship(m.relationship || RELATIONSHIP_GROUPS[0].key);
    setEmail(m.email || "");
    setPhone(m.phone || "");
    setExpiresAt(m.expires_at ? m.expires_at.slice(0, 10) : "");
    setPerms({
      view_updates: m.view_updates,
      view_appointments: m.view_appointments,
      add_appointments: m.add_appointments,
      view_documents: m.view_documents,
      upload_documents: m.upload_documents,
      view_medications: m.view_medications,
      confirm_medication_pickup: m.confirm_medication_pickup,
      create_tasks: m.create_tasks,
      view_private_health_details: m.view_private_health_details,
      view_trials: m.view_trials,
      emergency_access: m.emergency_access,
    });
    setShowMemberForm(true);
  }

  async function handleSaveMember() {
    if (!name) return;
    const sessionId = await getOrCreateSessionId();

    if (editingId) {
      const { error } = await supabase
        .from("care_circle_members")
        .update({ name, relationship, email, phone, expires_at: expiresAt || null, ...perms })
        .eq("id", editingId)
        .eq("session_id", sessionId);
      if (error) return console.error(error);
    } else {
      const { error } = await supabase.from("care_circle_members").insert({
        session_id: sessionId,
        name,
        relationship,
        email,
        phone,
        share_token: randomToken(),
        expires_at: expiresAt || null,
        ...perms,
      });
      if (error) return console.error(error);
    }

    setShowMemberForm(false);
    setEditingId(null);
    await loadAll();
  }

  async function handleDeleteMember(id) {
    const confirmed = window.confirm("Remove this person from your care circle?");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("care_circle_members").delete().eq("id", id).eq("session_id", sessionId);
    await loadAll();
  }

  async function handleRevokeMember(id) {
    const confirmed = window.confirm("Revoke this person's access immediately? They won't be able to view their link anymore.");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("care_circle_members").update({ revoked: true }).eq("id", id).eq("session_id", sessionId);
    await loadAll();
  }
  async function handleRestoreMember(id) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("care_circle_members").update({ revoked: false }).eq("id", id).eq("session_id", sessionId);
    await loadAll();
  }

  function copyLink(member) {
    const url = `${window.location.origin}/family/${member.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // --- Tasks ---
  async function createTask(title) {
    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase.from("care_tasks").insert({
      session_id: sessionId,
      title,
      category: title,
      status: "open",
    });
    if (error) return console.error(error);
    setShowAskForm(false);
    setAskText("");
    await loadAll();
  }

  async function claimTask(task) {
    const claimerName = window.prompt("Who's claiming this task?");
    if (!claimerName) return;

    const sessionId = await getOrCreateSessionId();
    await supabase
      .from("care_tasks")
      .update({ status: "claimed", claimed_by: claimerName })
      .eq("id", task.id)
      .eq("session_id", sessionId);
    await loadAll();
  }

  async function completeTask(task) {
    const sessionId = await getOrCreateSessionId();
    await supabase.from("care_tasks").update({ status: "done" }).eq("id", task.id).eq("session_id", sessionId);
    await loadAll();
  }

  async function deleteTask(id) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("care_tasks").delete().eq("id", id).eq("session_id", sessionId);
    await loadAll();
  }

  // --- Updates ---
  async function handleSendUpdate(text, category) {
    if (!text.trim()) return;
    const sessionId = await getOrCreateSessionId();
    const { error } = await supabase.from("care_updates").insert({
      session_id: sessionId,
      message: text,
      category: category || null,
    });
    if (error) return console.error(error);

    // Email everyone in the Care Circle who has opted into updates
    const now = new Date();
    const recipients = members
      .filter(
        (m) =>
          m.view_updates &&
          m.email &&
          !m.revoked &&
          (!m.expires_at || new Date(m.expires_at) >= now)
      )
      .map((m) => ({ name: m.name, email: m.email }));

    sendCareUpdateEmails({ recipients, message: text, category }).catch((err) =>
      console.error("Update email notification failed:", err)
    );

    setUpdateText("");
    setUpdateCategory("");
    await loadAll();
  }
async function handleDeleteWallMessage(id) {
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;
    const sessionId = await getOrCreateSessionId();
    await supabase.from("support_wall_messages").delete().eq("id", id).eq("session_id", sessionId);
    await loadAll();
  }
  const openTasks = tasks.filter((t) => t.status === "open");
  const claimedTasks = tasks.filter((t) => t.status === "claimed");

  const groupedMembers = RELATIONSHIP_GROUPS.map((g) => ({
    ...g,
    members: members.filter((m) => m.relationship === g.key),
  })).filter((g) => g.members.length > 0);

  const ungroupedMembers = members.filter(
    (m) => !RELATIONSHIP_GROUPS.some((g) => g.key === m.relationship)
  );

  if (view !== "home") {
    return (
      <SubView
        view={view}
        onBack={() => setView("home")}
        tasks={tasks}
        updates={updates}
        onClaimTask={claimTask}
        onCompleteTask={completeTask}
        onDeleteTask={deleteTask}
        updateText={updateText}
        setUpdateText={setUpdateText}
        updateCategory={updateCategory}
        setUpdateCategory={setUpdateCategory}
        onSendUpdate={handleSendUpdate}
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <span style={styles.eyebrow}>Care Circle</span>
        <h1 style={styles.heading}>❤️ Your Care Circle</h1>
        <p style={styles.subheading}>Coordinate care with the people you trust.</p>
      </div>

      {loading && <p style={styles.empty}>Loading...</p>}

      {!loading && (
        <>
          <div style={styles.sectionRow}>
            <div style={styles.sectionLabel}>People</div>
            <button style={styles.addButton} onClick={openNewMember}>
              <Plus size={18} />
            </button>
          </div>

          {members.length === 0 && (
            <p style={styles.empty}>No one added yet. Invite someone to your circle.</p>
          )}

          {groupedMembers.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.key} style={styles.peopleGroup}>
                <div style={styles.peopleGroupLabel}>
                  <Icon size={14} style={{ marginRight: "6px" }} />
                  {g.key}
                </div>
                <div style={styles.list}>
                 {g.members.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      onEdit={() => openEditMember(m)}
                      onDelete={() => handleDeleteMember(m.id)}
                      onRevoke={() => handleRevokeMember(m.id)}
                      onRestore={() => handleRestoreMember(m.id)}
                      onCopy={() => copyLink(m)}
                      copied={copiedId === m.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {ungroupedMembers.length > 0 && (
            <div style={styles.peopleGroup}>
              <div style={styles.peopleGroupLabel}>Other</div>
              <div style={styles.list}>
                {ungroupedMembers.map((m) => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    onEdit={() => openEditMember(m)}
                    onDelete={() => handleDeleteMember(m.id)}
                    onRevoke={() => handleRevokeMember(m.id)}
                    onRestore={() => handleRestoreMember(m.id)}
                    onCopy={() => copyLink(m)}
                    copied={copiedId === m.id}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ ...styles.sectionLabel, marginTop: "26px" }}>Today</div>
          <div style={styles.todayCard}>
            <div style={styles.todayRow}>
              <span style={styles.todayDot} />
              {openTasks.length} unclaimed task{openTasks.length !== 1 ? "s" : ""}
            </div>
            <div style={styles.todayRow}>
              <span style={styles.todayDot} />
              {nextAppointment
                ? `Upcoming: ${nextAppointment.title} on ${nextAppointment.appt_date}`
                : "No upcoming appointment"}
            </div>
            <div style={styles.todayRow}>
              <span style={styles.todayDot} />
              {activeMeds.length} active medication{activeMeds.length !== 1 ? "s" : ""}
            </div>
            <div style={styles.todayRow}>
              <span style={styles.todayDot} />
              {updates.length > 0 ? `Latest update: ${updates[0].message.slice(0, 50)}${updates[0].message.length > 50 ? "…" : ""}` : "No updates yet"}
            </div>
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: "26px" }}>Ask for help</div>
          <div style={styles.askGrid}>
            {ASK_TEMPLATES.map((t) => (
              <button key={t} style={styles.askChip} onClick={() => createTask(t)}>
                {t}
              </button>
            ))}
            <button style={styles.askChipCustom} onClick={() => setShowAskForm(true)}>
              + Custom request
            </button>
          </div>

          {(openTasks.length > 0 || claimedTasks.length > 0) && (
            <div style={{ marginTop: "16px" }}>
              {openTasks.map((t) => (
                <div key={t.id} style={styles.taskRow}>
                  <span style={{ flex: 1 }}>{t.title}</span>
                  <button style={styles.taskButton} onClick={() => claimTask(t)}>
                    Claim
                  </button>
                  <button style={styles.iconButton} onClick={() => deleteTask(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {claimedTasks.map((t) => (
                <div key={t.id} style={styles.taskRow}>
                  <span style={{ flex: 1 }}>
                    {t.title} <span style={styles.claimedBy}>· {t.claimed_by}</span>
                  </span>
                  <button style={styles.taskButton} onClick={() => completeTask(t)}>
                    Done
                  </button>
                  <button style={styles.iconButton} onClick={() => deleteTask(t.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...styles.sectionLabel, marginTop: "26px" }}>Shared tools</div>
          <div style={styles.toolsGrid}>
            <button style={styles.toolCard} onClick={() => setView("tasks")}>
              <ClipboardList size={18} />
              <span>Tasks</span>
            </button>
            <a href="/appointments" style={styles.toolCard}>
              <Calendar size={18} />
              <span>Calendar</span>
            </a>
            <button style={styles.toolCard} onClick={() => setView("updates")}>
              <MessageSquareHeart size={18} />
              <span>Updates</span>
            </button>
            <button style={styles.toolCard} onClick={() => setView("notes")}>
              <StickyNote size={18} />
              <span>Notes</span>
            </button>
            <a href="/documents" style={styles.toolCard}>
              <FileText size={18} />
              <span>Documents</span>
            </a>
            <a href="/medications" style={styles.toolCard}>
              <Pill size={18} />
              <span>Medications</span>
            </a>
          </div>

          <div style={{ ...styles.sectionLabel, marginTop: "26px" }}>Support wall</div>
          {wallMessages.length === 0 && (
            <p style={styles.empty}>No messages yet. Once loved ones leave encouragement, it'll show here.</p>
          )}
          <div style={styles.list}>
            {wallMessages.slice(0, 5).map((w) => (
              <div key={w.id} style={{ ...styles.wallCard, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={styles.cardTitle}>{w.member_name}</div>
                  <div style={styles.cardSubtitle}>{w.message}</div>
                </div>
                <button style={styles.iconButton} onClick={() => handleDeleteWallMessage(w.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showMemberForm && (
        <MemberForm
          editingId={editingId}
          name={name}
          setName={setName}
          relationship={relationship}
          setRelationship={setRelationship}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          expiresAt={expiresAt}
          setExpiresAt={setExpiresAt}
          perms={perms}
          setPerms={setPerms}
          onSave={handleSaveMember}
          onClose={() => setShowMemberForm(false)}
        />
      )}

      {showAskForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>Custom request</span>
              <button style={styles.closeButton} onClick={() => setShowAskForm(false)}>
                <X size={20} />
              </button>
            </div>
            <input
              style={styles.input}
              placeholder="What do you need help with?"
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
            />
            <button style={styles.saveButton} onClick={() => createTask(askText)}>
              Send request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ m, onEdit, onDelete, onRevoke, onRestore, onCopy, copied }) {
  const isExpired = m.expires_at && new Date(m.expires_at) < new Date();
  const lastViewed = m.last_viewed_at
    ? new Date(m.last_viewed_at).toLocaleDateString()
    : "Never viewed";

  return (
    <div style={styles.memberCard}>
      <div style={{ flex: 1 }}>
        <div style={styles.cardTitle}>{m.name}</div>
        <div style={styles.cardSubtitle}>{m.email}</div>
        <div style={styles.cardMeta}>
          {m.revoked ? "Access revoked" : isExpired ? "Access expired" : `Last viewed: ${lastViewed}`}
        </div>
      </div>
      <div style={styles.cardActions}>
        <button style={styles.iconButton} onClick={onCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button style={styles.iconButton} onClick={onEdit}>
          <Pencil size={14} />
        </button>
        {m.revoked ? (
          <button style={styles.restoreButton} onClick={onRestore}>
            Restore
          </button>
        ) : (
          <button style={styles.revokeButton} onClick={onRevoke}>
            Revoke
          </button>
        )}
        <button style={styles.iconButton} onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function MemberForm({ editingId, name, setName, relationship, setRelationship, email, setEmail, phone, setPhone, expiresAt, setExpiresAt, perms, setPerms, onSave, onClose }) {
  return (
    <div style={styles.formOverlay}>
      <div style={styles.formCard}>
        <div style={styles.formHeader}>
          <span style={styles.formTitle}>{editingId ? "Edit member" : "Invite someone"}</span>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <input style={styles.input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={styles.input} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
          {RELATIONSHIP_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.key}
            </option>
          ))}
        </select>
        <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={styles.permLabel}>Access expires (optional)</label>
        <input
          style={styles.input}
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />

        <div style={styles.permLabel}>Permissions</div>
        {[
          ["view_updates", "View general updates"],
          ["view_appointments", "View appointments"],
          ["add_appointments", "Add appointments"],
          ["view_medications", "View medications"],
          ["confirm_medication_pickup", "Confirm medication pickup"],
          ["view_documents", "View medical documents"],
          ["upload_documents", "Upload documents"],
          ["create_tasks", "Create tasks"],
          ["view_private_health_details", "View private health details"],
          ["view_trials", "View clinical trial updates"],
          ["emergency_access", "Emergency access"],
        ].map(([key, label]) => (
          <label key={key} style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={perms[key]}
              onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}

        <button style={styles.saveButton} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}

function SubView({ view, onBack, tasks, updates, onClaimTask, onCompleteTask, onDeleteTask, updateText, setUpdateText, updateCategory, setUpdateCategory, onSendUpdate }) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (view === "notes") loadNotes();
  }, [view]);

  async function loadNotes() {
    const sessionId = await getOrCreateSessionId();
    const { data } = await supabase
      .from("care_notes")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (data) setNotes(data.content || "");
  }

  async function saveNotes() {
    const sessionId = await getOrCreateSessionId();
    await supabase
      .from("care_notes")
      .upsert({ session_id: sessionId, content: notes }, { onConflict: "session_id" });
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        ← Back to Care Circle
      </button>

      {view === "tasks" && (
        <div>
          <h1 style={styles.heading}>Shared Tasks</h1>
          {tasks.length === 0 && <p style={styles.empty}>No tasks yet.</p>}
          <div style={styles.list}>
            {tasks.map((t) => (
              <div key={t.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>{t.title}</div>
                  <div style={styles.cardSubtitle}>
                    {t.status === "open" && "Unclaimed"}
                    {t.status === "claimed" && `Claimed by ${t.claimed_by}`}
                    {t.status === "done" && "Completed"}
                  </div>
                </div>
                {t.status === "open" && (
                  <button style={styles.taskButton} onClick={() => onClaimTask(t)}>
                    Claim
                  </button>
                )}
                {t.status === "claimed" && (
                  <button style={styles.taskButton} onClick={() => onCompleteTask(t)}>
                    Done
                  </button>
                )}
                <button style={styles.iconButton} onClick={() => onDeleteTask(t.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "updates" && (
        <div>
          <h1 style={styles.heading}>Send an Update</h1>
          <div style={styles.templateGrid}>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                style={styles.templateChip}
                onClick={() => {
                  setUpdateText(t.text);
                  setUpdateCategory(t.label);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            style={{ ...styles.input, minHeight: "90px", marginTop: "14px" }}
            placeholder="How are you today?"
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
          />
          <button style={styles.saveButton} onClick={() => onSendUpdate(updateText, updateCategory)}>
            Send update
          </button>

          <div style={{ ...styles.sectionLabel, marginTop: "24px" }}>History</div>
          <div style={styles.list}>
            {updates.map((u) => (
              <div key={u.id} style={styles.card}>
                <div style={{ flex: 1 }}>
                  <div style={styles.cardTitle}>{u.category || "Update"}</div>
                  <div style={styles.cardSubtitle}>{u.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "notes" && (
        <div>
          <h1 style={styles.heading}>Shared Notes</h1>
          <textarea
            style={{ ...styles.input, minHeight: "200px" }}
            placeholder="Notes visible to your care circle..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button style={styles.saveButton} onClick={saveNotes}>
            Save notes
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7E6DE",
    padding: "16px",
    paddingBottom: "80px",
    maxWidth: "600px",
    margin: "0 auto",
    fontFamily: "var(--font-work-sans), -apple-system, sans-serif",
  },
  headerBlock: { marginBottom: "18px" },
  eyebrow: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7C9885",
  },
  heading: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "24px",
    color: "#2A2622",
    margin: "6px 0 0",
  },
  subheading: { fontSize: "14px", color: "#5f6d63", marginTop: "6px" },
  backButton: {
    background: "none",
    border: "none",
    color: "#2B4339",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "16px",
  },
  sectionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" },
  sectionLabel: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#7C9885",
  },
  addButton: {
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    color: "#2B4339",
  },
  empty: { color: "#9a9488", fontSize: "14px", textAlign: "center", marginTop: "20px" },
  peopleGroup: { marginBottom: "14px" },
  peopleGroupLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: "#5f6d63",
    marginBottom: "6px",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  memberCard: {
    border: "1px solid #EAD0C4",
    borderRadius: "10px",
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#FFFFFF",
  },
  wallCard: {
    border: "1px solid #EAD0C4",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "#FFFFFF",
  },
  cardTitle: { fontSize: "13.5px", fontWeight: 600, color: "#2A2622" },
  cardSubtitle: { fontSize: "12px", color: "#5f6d63", marginTop: "2px" },
  cardMeta: { fontSize: "11px", color: "#9a9488", marginTop: "4px" },
  cardActions: { display: "flex", gap: "6px", flexShrink: 0 },
  iconButton: {
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "6px",
    padding: "5px 7px",
    cursor: "pointer",
    color: "#5f6d63",
  },
  revokeButton: {
    background: "#FFFFFF",
    border: "1px solid #B86F4E",
    color: "#8a4c33",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "11.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  restoreButton: {
    background: "#FFFFFF",
    border: "1px solid #2B4339",
    color: "#2B4339",
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "11.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  todayCard: {
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "12px",
    padding: "14px",
  },
  todayRow: { display: "flex", alignItems: "center", fontSize: "13px", marginBottom: "8px", color: "#2A2622" },
  todayDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#C9A227", marginRight: "8px", flexShrink: 0 },
  askGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  askChip: {
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "20px",
    padding: "8px 12px",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#2A2622",
  },
  askChipCustom: {
    background: "#2B4339",
    color: "#FAF6F0",
    border: "1px solid #2B4339",
    borderRadius: "20px",
    padding: "8px 12px",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 0",
    borderBottom: "1px solid #EAD0C4",
    fontSize: "13px",
    color: "#2A2622",
  },
  taskButton: {
    background: "#2B4339",
    color: "#FAF6F0",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  claimedBy: { color: "#9a9488", fontSize: "12px" },
  toolsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },
  toolCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "12px",
    padding: "14px 8px",
    textDecoration: "none",
    color: "#2B4339",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    border: "1px solid #EAD0C4",
    borderRadius: "10px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#FFFFFF",
  },
  templateGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  templateChip: {
    background: "#FFFFFF",
    border: "1px solid #EAD0C4",
    borderRadius: "20px",
    padding: "7px 12px",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    color: "#2A2622",
  },
  formOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(42,38,34,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "20px",
  },
  formCard: {
    background: "#F7E6DE",
    borderRadius: "12px",
    padding: "20px",
    width: "100%",
    maxWidth: "380px",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  formTitle: {
    fontFamily: "var(--font-fraunces), serif",
    fontWeight: 500,
    fontSize: "18px",
    color: "#2A2622",
  },
  closeButton: { background: "none", border: "none", cursor: "pointer", color: "#5f6d63" },
  permLabel: {
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "11px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#7C9885",
    margin: "10px 0 6px",
    display: "block",
  },
  checkboxRow: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", marginBottom: "8px", color: "#2A2622" },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #EAD0C4",
    fontSize: "14px",
    fontFamily: "inherit",
    background: "#FFFFFF",
    color: "#2A2622",
  },
  saveButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#2B4339",
    color: "#FAF6F0",
    fontWeight: 600,
    cursor: "pointer",
  },
};
