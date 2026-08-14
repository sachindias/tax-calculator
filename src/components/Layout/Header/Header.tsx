import styles from '@components/Layout/Header/Header.module.scss'
import { GoBook } from "react-icons/go";

const Header = () => {
  return (
    <header className={styles.HeaderContainer}>
    <div className={styles.HeaderTitleContainer}>
        <GoBook className={styles.HeaderIcon} />
        <div className={styles.Divider} />
        <h1 className={styles.HeaderTitle}>Simple Tax Calculator</h1>
    </div>
    </header>
  )
}

export default Header