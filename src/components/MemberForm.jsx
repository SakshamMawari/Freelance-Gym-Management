import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { asDate, compressImage, dateInput, friendlyError, today } from '../utils';
import CameraCapture from './CameraCapture';
import MembershipCalendarPicker from './MembershipCalendarPicker';

export default function MemberForm({ existing, plans = [], onDone, onCancel }) {
  const existingMembership = existing?.membership;
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(existing?.photoURL || existing?.photo || '');
  const [form, setForm] = useState({
    name: existing?.name || '',
    address: existing?.address || '',
    phone: existing?.phone || '',
    email: existing?.email || '',
    password: '',
    planId: existingMembership?.planId || existing?.planId || plans[0]?.id || '',
    startDate: dateInput(existingMembership?.startDate || existing?.startDate),
    method: existing?.payment || 'UPI',
    paid: existing?.paymentStatus ? existing.paymentStatus !== 'pending' : true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      const mem = existing.membership;
      setForm({
        name: existing.name || '',
        address: existing.address || '',
        phone: existing.phone || '',
        email: existing.email || '',
        password: '',
        planId: mem?.planId || existing.planId || plans[0]?.id || '',
        startDate: dateInput(mem?.startDate || existing.startDate),
        method: existing.payment || 'UPI',
        paid: existing.paymentStatus !== 'pending'
      });
      setPreview(existing.photoURL || existing.photo || '');
    }
  }, [existing, plans]);

  useEffect(() => {
    if (!form.planId && plans.length > 0) {
      setForm(f => ({ ...f, planId: plans[0].id }));
    }
  }, [plans, form.planId]);

  const plan = plans.find(item => item.id === form.planId) || plans[0];

  const save = async event => {
    event.preventDefault();
    setError('');
    const todayStr = today();
    const originalStartDate = existing ? dateInput(existingMembership?.startDate || existing.startDate) : null;
    if (!existing && form.startDate < todayStr) {
      setError('Registration date cannot be earlier than today.');
      return;
    }
    if (existing && form.startDate < todayStr && form.startDate !== originalStartDate) {
      setError('Registration date cannot be earlier than today.');
      return;
    }

    try {
      const memberId = existing?.id || existing?.uid;
      const expiry = new Date(`${form.startDate}T00:00:00`);
      expiry.setDate(expiry.getDate() + Number(plan?.durationDays || 30));
      const expiryIso = expiry.toISOString().slice(0, 10);

      // Handle photo upload
      let finalPhotoURL = preview;
      if (photo) {
        try {
          const { blob: compressedBlob, dataUrl } = await compressImage(photo, 500, 500, 0.82);
          const photoFileName = `${memberId || `temp_${Date.now()}`}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from('member-photos')
            .upload(photoFileName, compressedBlob || photo, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('member-photos')
              .getPublicUrl(photoFileName);
            finalPhotoURL = publicUrl;
          } else {
            // Fall back to dataUrl (compressed inline base64) if storage bucket is not configured yet
            finalPhotoURL = dataUrl || preview;
          }
        } catch {
          finalPhotoURL = preview;
        }
      }

      const memberPayload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim(),
        email: form.email?.trim() || null,
        plan_name: plan?.planName || 'Membership',
        plan_id: form.planId && String(form.planId).length > 20 ? form.planId : null,
        start_date: form.startDate,
        expiry_date: expiryIso,
        amount: Number(plan?.price || 0),
        payment_method: form.paid ? (form.method || 'UPI') : 'Pending',
        payment_status: form.paid ? 'paid' : 'pending',
        photo_url: finalPhotoURL || null
      };

      let finalId = memberId;

      if (existing) {
        const { error: updateErr } = await supabase
          .from('members')
          .update(memberPayload)
          .eq('id', memberId);
        if (updateErr) throw updateErr;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('members')
          .insert(memberPayload)
          .select()
          .single();
        if (insertErr) throw insertErr;
        finalId = inserted?.id;

        if (form.paid && finalId) {
          try {
            await supabase.from('payments').insert({
              member_id: finalId,
              plan_name: plan?.planName || 'Membership',
              amount: Number(plan?.price || 0),
              method: form.method || 'UPI',
              status: 'paid',
              payment_date: form.startDate
            });
          } catch (pe) {
            console.warn('Payment record insert note:', pe);
          }
        }
      }

      // If photo was captured and we now have the permanent ID to update the filename
      if (photo && finalId && finalPhotoURL && !finalPhotoURL.startsWith('http') && !finalPhotoURL.startsWith('data:')) {
        try {
          const { blob: compressedBlob } = await compressImage(photo, 500, 500, 0.82);
          const photoFileName = `${finalId}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from('member-photos')
            .upload(photoFileName, compressedBlob || photo, {
              contentType: 'image/jpeg',
              upsert: true
            });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('member-photos')
              .getPublicUrl(photoFileName);
            await supabase.from('members').update({ photo_url: publicUrl }).eq('id', finalId);
          }
        } catch (e) {
          console.warn('Photo upload note:', e);
        }
      }

      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  return (
    <form className="form-card" onSubmit={save}>
      <div className="form-section">
        <h3>Member photo</h3>
        <CameraCapture
          initialPhoto={preview}
          onPhotoChange={(blob, url) => {
            setPhoto(blob);
            setPreview(url);
          }}
        />
      </div>
      {!existing && (
        <>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input
              type="password"
              minLength="6"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </>
      )}
      <div className="field">
        <label>Name</label>
        <input
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Address</label>
        <textarea
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Phone</label>
        <input
          required
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="form-section">
        <h3>Membership & Date</h3>
        <div className="field">
          <label>Plan</label>
          <select
            required
            value={form.planId}
            onChange={e => setForm({ ...form, planId: e.target.value })}
          >
            {plans.map(item => (
              <option key={item.id} value={item.id}>
                {item.planName}
              </option>
            ))}
          </select>
          {plan && (
            <div className="plan-selected-badge">
              {plan.planName} · {plan.durationDays} days duration
            </div>
          )}
        </div>
        <MembershipCalendarPicker
          startDate={form.startDate}
          onChangeStartDate={iso => setForm(f => ({ ...f, startDate: iso }))}
          planDurationDays={plan?.durationDays}
          plan={plan?.planName}
          minDate={existing ? (existingMembership?.startDate ? asDate(existingMembership.startDate) : null) : new Date()}
        />
        <div className="field">
          <label>Payment method</label>
          <select
            value={form.method}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, method: val, paid: val !== 'Pending' }));
            }}
          >
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Pending">Pending (Mark complete later)</option>
          </select>
        </div>
        {form.method === 'Pending' && (
          <p className="notice" style={{ color: 'var(--orange)', borderColor: 'var(--orange)' }}>
            Payment will be recorded as <strong>Pending</strong>. You can mark it as complete later from Overview or Member details.
          </p>
        )}
      </div>
      {error && <div className="error-text">{error}</div>}
      <div className={onCancel ? 'edit-form-actions' : ''}>
        <button
          type="submit"
          className="primary-btn"
          disabled={!plans.length}
        >
          {existing ? 'Save member' : 'Create member'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="outline-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
