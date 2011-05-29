# DON'T USE JUST YET! Not sure this is what we need... will finalize shortly. :)

CREATE TABLE mmm_votes (
  id INT NOT NULL AUTO_INCREMENT,
  added DATETIME,
  voter_id BIGINT,
  user1_id BIGINT,
  vote1 ENUM('Marry', 'Murder', 'Mate'),
  user2_id BIGINT,
  vote2 ENUM('Marry', 'Murder', 'Mate'),
  user3_id BIGINT,
  vote3 ENUM('Marry', 'Murder', 'Mate')
);