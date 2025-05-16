'use client';
import { useEffect, useState } from 'react';

type Beschwerde = {
    id: number;
    name: string;
    email: string;
    betreff: string;
    beschreibung: string;
    beschwerdegrund: string;
    datum: string;
    uhrzeit: string;
    haltestelle?: string;
    linie?: string;
    erstelltam: string;
};

export default function BeschwerdeTable() {
    const [beschwerden, setBeschwerden] = useState<Beschwerde[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/api/beschwerden'); // Passe den Pfad ggf. an
            const data = await res.json();
            setBeschwerden(data);
        };

        fetchData();
    }, []);

    return (
        <div className="w-full overflow-x-auto bg-white shadow-lg rounded-xl p-4">
            <h1 className="text-2xl font-bold mb-4">Beschwerden</h1>
            <table className="min-w-full table-auto border-collapse">
                <thead>
                    <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">ID</th>
                        <th className="p-2 border">Name</th>
                        <th className="p-2 border">Email</th>
                        <th className="p-2 border">Betreff</th>
                        <th className="p-2 border">Grund</th>
                        <th className="p-2 border">Linie</th>
                        <th className="p-2 border">Haltestelle</th>
                        <th className="p-2 border">Datum</th>
                        <th className="p-2 border">Aktion</th>
                    </tr>
                </thead>
                <tbody>
                    {beschwerden.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                            <td className="p-2 border">{b.id}</td>
                            <td className="p-2 border">{b.name}</td>
                            <td className="p-2 border">{b.email}</td>
                            <td className="p-2 border">{b.betreff}</td>
                            <td className="p-2 border">{b.beschwerdegrund}</td>
                            <td className="p-2 border">{b.linie || '-'}</td>
                            <td className="p-2 border">{b.haltestelle || '-'}</td>
                            <td className="p-2 border">{b.datum}</td>
                            <td className="p-2 border">
                                <button className="text-red-500 hover:underline">Löschen</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
