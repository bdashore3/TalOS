import { Lorebook } from "@/classes/Lorebook";
import { Book, TrashIcon } from "lucide-react";

interface LorebookInfoProps {
    book: Lorebook | null;
    onClick?: (book: Lorebook | null) => void;
    onEdit?: (book: Lorebook) => void;
    onDelete?: (book: Lorebook) => void;
}

const LorebookInfo = (props: LorebookInfoProps) => {
    const { book, onClick, onDelete, onEdit } = props;

    return (
        <div className="themed-box-no-padding w-full flex flex-row justify-start p-1 items-center gap-4" onClick={()=> {if(onClick !== undefined) onClick(book ? book : null)}}>
            <div className="grid grid-cols-3 gap-6 w-2/3 justify-start items-center">
                <div className="themed-chat-avatar flex items-center justify-center">
                    {book?.avatar ? (<img src={book.avatar} className="themed-chat-avatar"/>) : (<Book size={36}/>)}
                </div>
                <p className="text-left">{book?.name ? book.name : 'New Lorebook'}</p>
            </div>
            <div className="flex flex-row gap-4 w-1/3 justify-end items-center">
                {book !== null ? (
                <button className="message-button mr-4"
                    onClick={() => {
                        if(onDelete === undefined) return;
                        if(book === null) return;
                        onDelete(book);
                    }}
                >
                    <TrashIcon size={18} />
                </button>
                ) : null}
            </div>
        </div>
    );
}
export default LorebookInfo;